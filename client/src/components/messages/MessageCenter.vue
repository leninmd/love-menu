<script setup lang="ts">
import { computed, shallowRef } from 'vue'

interface MessageItem {
  id: string
  status: string
  created_at: number
  total_price: number
}

const props = defineProps<{
  scope: 'customer' | 'owner'
  messages: MessageItem[]
  loading: boolean
  error: string
}>()

const filter = shallowRef<'all' | 'submitted' | 'accepted' | 'completed'>('all')

const filteredMessages = computed(() => {
  if (filter.value === 'all') return props.messages
  return props.messages.filter((item) => item.status === filter.value)
})

function formatTime(timestamp: number) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    submitted: '已提交',
    accepted: '已接单',
    completed: '已完成'
  }
  return map[status] || status
}

function formatPrice(total: number) {
  if (!total) return '¥0'
  return `¥${(total / 100).toFixed(0)}`
}

const title = computed(() =>
  props.scope === 'customer' ? '我提交的订单' : '我收到的订单'
)
</script>

<template>
  <section class="card">
    <header class="card-header">
      <div>
        <h2 class="card-title">消息中心</h2>
        <p class="card-subtitle">{{ title }}</p>
      </div>
      <div class="card-filters">
        <button
          v-for="status in ['all', 'submitted', 'accepted', 'completed']"
          :key="status"
          class="ghost"
          :class="{ active: filter === status }"
          type="button"
          @click="filter = status as any"
        >
          {{ status === 'all' ? '全部' : formatStatus(status) }}
        </button>
      </div>
    </header>
    <div class="card-body">
      <div v-if="loading" class="empty">消息加载中...</div>
      <div v-else-if="error" class="empty">{{ error }}</div>
      <div v-else-if="!filteredMessages.length" class="empty">这里还没有消息</div>
      <div v-for="item in filteredMessages" :key="item.id" class="message-item">
        <div>
          <p class="message-id">{{ item.id }}</p>
          <p class="message-meta">
            {{ formatTime(item.created_at) }} · {{ formatPrice(item.total_price) }}
          </p>
        </div>
        <span class="message-status">{{ formatStatus(item.status) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 16px;
  background: var(--color-surface);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.card-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-muted);
}

.card-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}

.ghost.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.card-body {
  display: grid;
  gap: 10px;
}

.message-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f7f4ff;
}

.message-id {
  margin: 0 0 4px;
  font-weight: 600;
}

.message-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.message-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--color-border);
}

.empty {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
