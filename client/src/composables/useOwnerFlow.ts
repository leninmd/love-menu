import { shallowRef } from 'vue'
import {
  acceptOwnerOrder,
  completeOwnerOrder,
  fetchOwnerOrders
} from '../api/client'

export function useOwnerFlow(token: () => string, restaurantId: () => string) {
  const orders = shallowRef<any[]>([])
  const loading = shallowRef(false)
  const error = shallowRef('')

  async function loadOrders() {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      const data = await fetchOwnerOrders(token(), restaurantId())
      orders.value = data.orders
    } catch (err) {
      error.value = err instanceof Error ? err.message : '订单加载失败'
    } finally {
      loading.value = false
    }
  }

  function setOrders(next: any[]) {
    orders.value = next
  }

  async function accept(id: string) {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      await acceptOwnerOrder(token(), id, restaurantId())
      await loadOrders()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '接单失败'
    } finally {
      loading.value = false
    }
  }

  async function complete(id: string) {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      await completeOwnerOrder(token(), id, restaurantId())
      await loadOrders()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '完成失败'
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    loading,
    error,
    setOrders,
    loadOrders,
    accept,
    complete
  }
}
