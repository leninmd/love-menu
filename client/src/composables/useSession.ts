import { shallowRef } from 'vue'
import { listMyRestaurants, createRestaurant } from '../api/client'

const TOKEN_KEY = 'love_menu_token'
const RESTAURANT_KEY = 'love_menu_restaurant_id'

const token = shallowRef(localStorage.getItem(TOKEN_KEY) || '')
const restaurantId = shallowRef(localStorage.getItem(RESTAURANT_KEY) || '')
const loading = shallowRef(false)
const error = shallowRef('')

export function useSession() {
  async function bootstrap() {
    if (!token.value || loading.value) return
    loading.value = true
    error.value = ''
    try {
      if (!restaurantId.value) {
        const data = await listMyRestaurants(token.value)
        const active = data.restaurants.find((r) => r.is_deleted === 0)
        if (active) {
          restaurantId.value = active.id
          localStorage.setItem(RESTAURANT_KEY, active.id)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化失败'
    } finally {
      loading.value = false
    }
  }

  async function ensureRestaurant(name: string) {
    if (!token.value) return
    loading.value = true
    error.value = ''
    try {
      const result = await createRestaurant(token.value, name)
      restaurantId.value = result.id
      localStorage.setItem(RESTAURANT_KEY, result.id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建餐厅失败'
    } finally {
      loading.value = false
    }
  }

  function setToken(next: string) {
    token.value = next
    if (next) {
      localStorage.setItem(TOKEN_KEY, next)
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(RESTAURANT_KEY)
      restaurantId.value = ''
    }
  }

  function logout() {
    setToken('')
  }

  return {
    token,
    restaurantId,
    loading,
    error,
    bootstrap,
    ensureRestaurant,
    setToken,
    logout
  }
}
