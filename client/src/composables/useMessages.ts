import { shallowRef } from 'vue'
import { fetchMessages } from '../api/client'

export function useMessages(
  token: () => string,
  restaurantId: () => string
) {
  const loading = shallowRef(false)
  const error = shallowRef('')
  const customerMessages = shallowRef<any[]>([])
  const ownerMessages = shallowRef<any[]>([])

  async function loadCustomer() {
    if (!token()) return
    loading.value = true
    error.value = ''
    try {
      const data = await fetchMessages(token(), 'customer')
      customerMessages.value = data.messages
    } catch (err) {
      error.value = err instanceof Error ? err.message : '消息加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadOwner() {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      const data = await fetchMessages(token(), 'owner', restaurantId())
      ownerMessages.value = data.messages
    } catch (err) {
      error.value = err instanceof Error ? err.message : '消息加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    customerMessages,
    ownerMessages,
    loadCustomer,
    loadOwner
  }
}
