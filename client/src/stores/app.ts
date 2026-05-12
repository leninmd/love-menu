import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    mode: 'customer' as 'customer' | 'owner'
  }),
  actions: {
    setMode(next: 'customer' | 'owner') {
      this.mode = next
    }
  }
})
