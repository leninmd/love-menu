import { shallowRef } from 'vue'
import { request } from '../api/http'

const STORAGE_KEY = 'love_menu_push_subscription'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const loading = shallowRef(false)
  const error = shallowRef('')
  const supported = shallowRef(
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  )

  async function subscribe(token: string) {
    if (!supported.value) {
      error.value = '当前环境不支持推送'
      return
    }
    loading.value = true
    error.value = ''
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      let subscription = existing
      if (!subscription) {
        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
        if (!publicKey) {
          throw new Error('缺少 VAPID 公钥')
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        })
      }
      await request('/v1/push/subscribe', {
        method: 'POST',
        body: { subscription },
        token
      })
      localStorage.setItem(STORAGE_KEY, subscription.endpoint)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '订阅失败'
    } finally {
      loading.value = false
    }
  }

  async function unsubscribe(token: string) {
    if (!supported.value) return
    loading.value = true
    error.value = ''
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      const endpoint = subscription?.endpoint || localStorage.getItem(STORAGE_KEY) || ''
      if (subscription) {
        await subscription.unsubscribe()
      }
      if (endpoint) {
        await request('/v1/push/unsubscribe', {
          method: 'DELETE',
          body: { endpoint },
          token
        })
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '取消订阅失败'
    } finally {
      loading.value = false
    }
  }

  return {
    supported,
    loading,
    error,
    subscribe,
    unsubscribe
  }
}
