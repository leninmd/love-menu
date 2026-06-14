<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useOwnerFlow } from '../../composables/useOwnerFlow'
import { useOrderStream } from '../../composables/useOrderStream'
import { useSession } from '../../composables/useSession'
import AuthPanel from '../auth/AuthPanel.vue'
import OwnerOrders from './OwnerOrders.vue'
import OwnerKitchen from './OwnerKitchen.vue'
import MessageCenter from '../messages/MessageCenter.vue'
import { useMessages } from '../../composables/useMessages'
import { listMyRestaurants } from '../../api/client'
import type { Restaurant } from '../../api/client'

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

const restaurants = shallowRef<Restaurant[]>([])
const newRestaurantName = shallowRef('')
const creating = shallowRef(false)
const createError = shallowRef('')

function handleStream(event: Event) {
  const detail = (event as CustomEvent).detail
  if (!detail?.orders) return
  flow.setOrders(detail.orders)
}

async function loadRestaurants() {
  if (!session.token.value) return
  try {
    const data = await listMyRestaurants(session.token.value)
    restaurants.value = data.restaurants.filter((r) => r.is_deleted === 0)
  } catch {
    restaurants.value = []
  }
}

async function handleCreateRestaurant() {
  const name = newRestaurantName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  createError.value = ''
  try {
    await session.ensureRestaurant(name)
    newRestaurantName.value = ''
    await loadRestaurants()
    await loadData()
  } catch (err) {
    createError.value = err instanceof Error ? err.message : '创建失败'
  } finally {
    creating.value = false
  }
}

function selectRestaurant(id: string) {
  session.restaurantId.value = id
  localStorage.setItem('love_menu_restaurant_id', id)
  loadData()
}

async function loadData() {
  if (session.token.value && session.restaurantId.value) {
    await Promise.all([flow.loadOrders(), messages.loadOwner()])
    stream.connect(session.token.value, {
      owner: true,
      restaurantId: session.restaurantId.value
    })
  }
}

async function init() {
  await session.bootstrap()
  await loadRestaurants()
  if (session.token.value && session.restaurantId.value) {
    await loadData()
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
    <p v-else-if="flow.error.value" class="panel-error">
      {{ flow.error.value }}
    </p>
    <AuthPanel v-if="!session.token.value" @success="handleLogin" />
    <template v-else>
      <div v-if="!session.restaurantId.value" class="restaurant-setup">
        <h2 class="setup-title">我的餐厅</h2>
        <div
          v-for="r in restaurants"
          :key="r.id"
          class="restaurant-card"
          @click="selectRestaurant(r.id)"
        >
          <span class="restaurant-name">{{ r.name }}</span>
          <span class="restaurant-intro">{{ r.intro || '暂无简介' }}</span>
        </div>
        <div class="create-form">
          <input
            v-model="newRestaurantName"
            class="create-input"
            placeholder="输入餐厅名称"
            @keyup.enter="handleCreateRestaurant"
          />
          <button
            class="create-button"
            type="button"
            :disabled="creating || !newRestaurantName.trim()"
            @click="handleCreateRestaurant"
          >
            {{ creating ? '创建中...' : '创建餐厅' }}
          </button>
          <p v-if="createError" class="create-error">{{ createError }}</p>
        </div>
      </div>
      <div v-else class="panel-grid">
        <OwnerOrders
          :orders="flow.orders.value"
          :loading="flow.loading.value"
          @accept="flow.accept"
          @complete="flow.complete"
          @refresh="flow.loadOrders"
        />
        <OwnerKitchen
          :token="session.token.value"
          :restaurant-id="session.restaurantId.value"
        />
      </div>
    </template>
    <MessageCenter
      v-if="session.token.value && session.restaurantId.value"
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

.restaurant-setup {
  display: grid;
  gap: 16px;
}

.setup-title {
  margin: 0;
  font-size: 20px;
  color: var(--color-text-strong);
}

.restaurant-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  display: grid;
  gap: 4px;
  transition: border-color 0.2s;
}

.restaurant-card:hover {
  border-color: var(--color-accent);
}

.restaurant-name {
  font-weight: 600;
  font-size: 16px;
}

.restaurant-intro {
  font-size: 13px;
  color: var(--color-muted);
}

.create-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.create-input {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 16px;
  flex: 1;
  min-width: 160px;
}

.create-button {
  border-radius: 999px;
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: white;
  padding: 8px 20px;
  cursor: pointer;
}

.create-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-error {
  margin: 0;
  font-size: 13px;
  color: #b0382e;
  width: 100%;
}
</style>
