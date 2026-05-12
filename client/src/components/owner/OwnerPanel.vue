<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useOwnerFlow } from '../../composables/useOwnerFlow'
import { useOrderStream } from '../../composables/useOrderStream'
import { useSession } from '../../composables/useSession'
import AuthPanel from '../auth/AuthPanel.vue'
import OwnerOrders from './OwnerOrders.vue'
import OwnerKitchen from './OwnerKitchen.vue'
import OwnerStats from './OwnerStats.vue'
import MessageCenter from '../messages/MessageCenter.vue'
import { useMessages } from '../../composables/useMessages'

const session = useSession()
const flow = useOwnerFlow(
  () => session.token.value,
  () => session.restaurantId.value
)
const stream = useOrderStream()
const messages = useMessages(
  () => session.token.value,
  () => session.restaurantId.value
)

function handleStream(event: Event) {
  const detail = (event as CustomEvent).detail
  if (!detail?.orders) return
  flow.setOrders(detail.orders)
}

async function init() {
  await session.bootstrap()
  if (session.token.value) {
    await Promise.all([flow.loadOrders(), messages.loadOwner()])
    stream.connect(session.token.value, {
      owner: true,
      restaurantId: session.restaurantId.value
    })
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
  stream.disconnect()
  window.removeEventListener('orders:update', handleStream)
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <div>
        <p class="panel-tag">店主端</p>
        <h1 class="panel-title">管理控制台</h1>
      </div>
      <button class="panel-action" type="button" @click="flow.loadOrders()">
        刷新订单
      </button>
    </header>
    <p v-if="session.loading.value" class="panel-hint">正在连接服务...</p>
    <p v-else-if="session.error.value" class="panel-error">
      {{ session.error.value }}
    </p>
    <p v-else-if="flow.error.value" class="panel-error">{{ flow.error.value }}</p>
    <AuthPanel v-if="!session.token.value" @success="handleLogin" />
    <div v-else class="panel-grid">
      <OwnerOrders
        :orders="flow.orders.value"
        :loading="flow.loading.value"
        @accept="flow.accept"
        @complete="flow.complete"
        @refresh="flow.loadOrders"
      />
      <OwnerKitchen :token="session.token.value" :restaurant-id="session.restaurantId.value" />
    </div>
    <OwnerStats v-if="session.token.value" />
    <MessageCenter
      v-if="session.token.value"
      scope="owner"
      :messages="messages.ownerMessages.value"
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
</style>
