<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useSession } from '../../composables/useSession'
import { usePushNotifications } from '../../composables/usePushNotifications'
import { deleteAccount } from '../../api/client'

const appStore = useAppStore()
const { mode } = storeToRefs(appStore)
const router = useRouter()
const session = useSession()
const push = usePushNotifications()

const showDeleteConfirm = shallowRef(false)
const deleting = shallowRef(false)

function setMode(next: 'customer' | 'owner') {
  appStore.setMode(next)
  router.push(next === 'customer' ? '/customer' : '/owner')
}

function goHome() {
  router.push('/')
}

function logout() {
  session.logout()
  router.push('/')
}

async function handleDeleteAccount() {
  if (!session.token.value || deleting.value) return
  deleting.value = true
  try {
    await deleteAccount(session.token.value)
    session.logout()
    showDeleteConfirm.value = false
    router.push('/')
  } catch {
    deleting.value = false
  }
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
const hasSession = computed(() => Boolean(session.token.value))

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
        v-if="pushSupported && hasSession"
        class="nav-button"
        type="button"
        @click="togglePush"
      >
        {{ pushSubscribed ? '关闭推送' : '开启推送' }}
      </button>
      <button
        v-if="hasSession"
        class="nav-button nav-danger"
        type="button"
        @click="logout"
      >
        登出
      </button>
    </nav>
    <div v-if="hasSession" class="account-section">
      <button
        v-if="!showDeleteConfirm"
        class="account-link"
        type="button"
        @click="showDeleteConfirm = true"
      >
        注销账户
      </button>
      <div v-else class="delete-confirm">
        <span class="delete-text">确认注销？所有数据将被删除</span>
        <button
          class="nav-button nav-danger"
          type="button"
          :disabled="deleting"
          @click="handleDeleteAccount"
        >
          {{ deleting ? '处理中...' : '确认注销' }}
        </button>
        <button
          class="nav-button"
          type="button"
          @click="showDeleteConfirm = false"
        >
          取消
        </button>
      </div>
    </div>
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
  flex-wrap: wrap;
  gap: 12px;
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

.nav-danger {
  border-color: #c0392b;
  color: #c0392b;
}

.account-section {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.account-link {
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.delete-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-text {
  font-size: 13px;
  color: #c0392b;
}
</style>
