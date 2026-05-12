<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useSession } from '../../composables/useSession'
import { usePushNotifications } from '../../composables/usePushNotifications'

const appStore = useAppStore()
const { mode } = storeToRefs(appStore)
const router = useRouter()
const session = useSession()
const push = usePushNotifications()

function setMode(next: 'customer' | 'owner') {
  appStore.setMode(next)
  router.push(next === 'customer' ? '/customer' : '/owner')
}

function goHome() {
  router.push('/')
}

async function togglePush() {
  if (!session.token.value) return
  if (push.loading.value) return
  if (pushSupported.value) {
    if (pushSubscribed.value) {
      await push.unsubscribe(session.token.value)
      pushSubscribed.value = false
    } else {
      await push.subscribe(session.token.value)
      pushSubscribed.value = true
    }
  }
}

const pushSupported = computed(() => push.supported.value)
const pushSubscribed = shallowRef(false)

onMounted(async () => {
  if (!pushSupported.value) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    pushSubscribed.value = Boolean(subscription)
  } catch {
    pushSubscribed.value = false
  }
})
</script>

<template>
  <header class="header">
    <button class="brand" type="button" @click="goHome">
      <span class="brand-name">恋上菜单</span>
      <span class="brand-tag">Love Menu</span>
    </button>
    <nav class="nav">
      <button
        class="nav-button"
        :class="{ active: mode === 'customer' }"
        type="button"
        @click="setMode('customer')"
      >
        顾客模式
      </button>
      <button
        class="nav-button"
        :class="{ active: mode === 'owner' }"
        type="button"
        @click="setMode('owner')"
      >
        店主模式
      </button>
      <button
        v-if="pushSupported"
        class="nav-button"
        type="button"
        @click="togglePush"
      >
        {{ pushSubscribed ? '关闭推送' : '开启推送' }}
      </button>
    </nav>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px clamp(20px, 5vw, 64px);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 2px;
}

.brand-tag {
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 1px;
}

.nav {
  display: flex;
  gap: 12px;
}

.nav-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: inherit;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(209, 106, 84, 0.15);
}
</style>
