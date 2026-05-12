import { shallowRef } from 'vue'

export function useOrderStream() {
  const active = shallowRef(false)
  let source: EventSource | null = null
  let retryTimer: number | null = null
  let retryCount = 0
  let lastOptions: { token: string; owner: boolean; restaurantId?: string } | null = null

  function connect(token: string, options: { owner: boolean; restaurantId?: string }) {
    if (!token) return
    if (source) {
      source.close()
    }
    if (retryTimer) {
      window.clearTimeout(retryTimer)
      retryTimer = null
    }
    retryCount = 0
    lastOptions = { token, owner: options.owner, restaurantId: options.restaurantId }

    const params = new URLSearchParams()
    params.set('owner', options.owner ? 'true' : 'false')
    if (options.restaurantId) {
      params.set('restaurantId', options.restaurantId)
    }

    const urlBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
    params.set('token', token)
    const url = `${urlBase}/v1/orders/stream?${params.toString()}`
    source = new EventSource(url, { withCredentials: false })
    active.value = true

    source.addEventListener('orders', (event) => {
      const detail = JSON.parse((event as MessageEvent).data)
      window.dispatchEvent(new CustomEvent('orders:update', { detail }))
    })

    source.addEventListener('error', () => {
      active.value = false
      scheduleReconnect()
    })
  }

  function scheduleReconnect() {
    if (!lastOptions || retryTimer) return
    const delay = Math.min(30000, 2000 * Math.pow(2, retryCount))
    retryCount += 1
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      connect(lastOptions.token, {
        owner: lastOptions.owner,
        restaurantId: lastOptions.restaurantId
      })
    }, delay)
  }

  function disconnect() {
    if (!source) return
    source.close()
    source = null
    active.value = false
    if (retryTimer) {
      window.clearTimeout(retryTimer)
      retryTimer = null
    }
    lastOptions = null
  }

  return {
    active,
    connect,
    disconnect
  }
}
