<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useCustomerFlow } from '../../composables/useCustomerFlow'
import { useOrderStream } from '../../composables/useOrderStream'
import { useSession } from '../../composables/useSession'
import AuthPanel from '../auth/AuthPanel.vue'
import CustomerMenu from './CustomerMenu.vue'
import CustomerCart from './CustomerCart.vue'
import CustomerOrders from './CustomerOrders.vue'
import MessageCenter from '../messages/MessageCenter.vue'
import { useMessages } from '../../composables/useMessages'

const session = useSession()
const flow = useCustomerFlow(
  () => session.token.value,
  () => session.restaurantId.value
)
const stream = useOrderStream()
const messages = useMessages(
  () => session.token.value,
  () => session.restaurantId.value
)

const search = shallowRef('')
const searchTerm = computed(() => search.value.trim())
const hasSession = computed(() => Boolean(session.token.value))
let searchTimer: number | null = null

watch(
  searchTerm,
  (value) => {
    if (searchTimer) {
      window.clearTimeout(searchTimer)
    }
    searchTimer = window.setTimeout(() => {
      if (hasSession.value) {
        flow.loadMenu(value)
      }
    }, 300)
  },
  { immediate: true }
)

let pollTimer: number | null = null

function startPolling() {
  if (pollTimer || !session.token.value) return
  pollTimer = window.setInterval(() => {
    flow.loadOrders()
  }, 12000)
}

function stopPolling() {
  if (!pollTimer) return
  window.clearInterval(pollTimer)
  pollTimer = null
}

function handleStream(event: Event) {
  const detail = (event as CustomEvent).detail
  if (!detail?.orders) return
  flow.setOrders(detail.orders)
}

async function init() {
  await session.bootstrap()
  if (hasSession.value) {
    await Promise.all([
      flow.loadMenu(searchTerm.value),
      flow.loadCart(),
      flow.loadOrders(),
      messages.loadCustomer()
    ])
  }
  if (session.token.value) {
    stream.connect(session.token.value, {
      owner: false,
      restaurantId: session.restaurantId.value
    })
    startPolling()
  }
}

async function handleLogin(token: string) {
  session.setToken(token)
  await init()
}

onMounted(() => {
  init()
  window.addEventListener('orders:update', handleStream)
})

onBeforeUnmount(() => {
  stopPolling()
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
  stream.disconnect()
  window.removeEventListener('orders:update', handleStream)
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <div>
        <p class="panel-tag">顾客端</p>
        <h1 class="panel-title">点餐流程</h1>
      </div>
      <button class="panel-action" type="button" @click="flow.loadMenu()">
        刷新菜单
      </button>
    </header>
    <p v-if="session.loading.value" class="panel-hint">正在连接服务...</p>
    <p v-else-if="session.error.value" class="panel-error">
      {{ session.error.value }}
    </p>
    <p v-else-if="flow.error.value" class="panel-error">{{ flow.error.value }}</p>
    <AuthPanel v-if="!hasSession" @success="handleLogin" />
    <div v-else class="panel-grid">
      <CustomerMenu
        :categories="flow.menu.value.categories"
        :dishes="flow.menu.value.dishes"
        :search="search"
        @add="flow.addItem"
      />
      <CustomerCart
        :items="flow.cart.value.items"
        :loading="flow.loading.value"
        @update="flow.updateItem"
        @remove="flow.removeItem"
        @submit="flow.submitOrder"
      />
    </div>
    <div v-if="hasSession" class="panel-search">
      <label class="search-label" for="menu-search">搜索菜品</label>
      <input
        id="menu-search"
        v-model="search"
        class="search-input"
        type="search"
        placeholder="输入菜名"
      />
      <p class="search-hint">搜索会在停止输入 0.3 秒后生效</p>
    </div>
    <CustomerOrders
      v-if="hasSession"
      :orders="flow.orders.value"
      :loading="flow.loading.value"
      :token="session.token.value"
      @refresh="flow.loadOrders"
    />
    <MessageCenter
      v-if="hasSession"
      scope="customer"
      :messages="messages.customerMessages.value"
      :loading="messages.loading.value"
      :error="messages.error.value"
    />
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-tag {
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-accent);
  margin: 0 0 6px;
}

.panel-title {
  margin: 0;
  font-size: 28px;
  color: var(--color-text-strong);
}

.panel-action {
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 8px 16px;
  cursor: pointer;
}

.panel-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}

.panel-error {
  margin: 0;
  font-size: 13px;
  color: #b0382e;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.panel-search {
  display: grid;
  gap: 6px;
  max-width: 320px;
}

.search-label {
  font-size: 12px;
  color: var(--color-muted);
}

.search-input {
  border-radius: 999px;
  border: 1px solid var(--color-border);
  padding: 6px 12px;
}

.search-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-muted);
}
</style>
