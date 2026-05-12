import { computed, shallowRef } from 'vue'
import {
  addCartItem,
  createOrder,
  fetchCart,
  fetchMenu,
  fetchOrders,
  removeCartItem,
  updateCartItem
} from '../api/client'

export function useCustomerFlow(token: () => string, restaurantId: () => string) {
  const loading = shallowRef(false)
  const menu = shallowRef<{ categories: any[]; dishes: any[] }>({
    categories: [],
    dishes: []
  })
  const cart = shallowRef<{ cartId: string; items: any[] }>({
    cartId: '',
    items: []
  })
  const orders = shallowRef<any[]>([])
  const error = shallowRef('')

  async function loadMenu(search = '') {
    if (!restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      menu.value = await fetchMenu(restaurantId(), search)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '菜单加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadCart() {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      cart.value = await fetchCart(token(), restaurantId())
    } catch (err) {
      error.value = err instanceof Error ? err.message : '购物车加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadOrders() {
    if (!token()) return
    loading.value = true
    error.value = ''
    try {
      const data = await fetchOrders(token())
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

  async function addItem(dishId: string) {
    if (!token() || !restaurantId()) return
    loading.value = true
    error.value = ''
    try {
      await addCartItem(token(), restaurantId(), dishId, 1)
      await loadCart()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加入失败'
    } finally {
      loading.value = false
    }
  }

  async function updateItem(itemId: string, quantity: number) {
    if (!token()) return
    loading.value = true
    error.value = ''
    try {
      await updateCartItem(token(), itemId, quantity)
      await loadCart()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新失败'
    } finally {
      loading.value = false
    }
  }

  async function removeItem(itemId: string) {
    if (!token()) return
    loading.value = true
    error.value = ''
    try {
      await removeCartItem(token(), itemId)
      await loadCart()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移除失败'
    } finally {
      loading.value = false
    }
  }

  async function submitOrder() {
    if (!token() || !restaurantId() || !cart.value.cartId) return
    loading.value = true
    error.value = ''
    try {
      await createOrder(token(), cart.value.cartId, restaurantId())
      await loadCart()
      await loadOrders()
    } catch (err) {
      const message = err instanceof Error ? err.message : '下单失败'
      error.value = message
      if (message === 'dish_deleted') {
        await loadCart()
      }
    } finally {
      loading.value = false
    }
  }

  const cartCount = computed(() => cart.value.items.length)

  return {
    loading,
    error,
    menu,
    cart,
    orders,
    cartCount,
    setOrders,
    loadMenu,
    loadCart,
    loadOrders,
    addItem,
    updateItem,
    removeItem,
    submitOrder
  }
}
