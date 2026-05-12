import { shallowRef } from 'vue'
import { seed } from '../api/client'

const token = shallowRef('')
const restaurantId = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')

export function useSession() {
  async function bootstrap() {
    if (!token.value || loading.value) return
    loading.value = true
    error.value = ''
    try {
      if (!restaurantId.value) {
        const seeded = await seed(token.value)
        restaurantId.value = seeded.restaurantId
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化失败'
    } finally {
      loading.value = false
    }
  }

  function setToken(next: string) {
    token.value = next
  }

  return {
    token,
    restaurantId,
    loading,
    error,
    bootstrap,
    setToken
  }
}
