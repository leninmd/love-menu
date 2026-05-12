<script setup lang="ts">
interface OwnerOrder {
  id: string
  status: string
  created_at: number
  total_price: number
}

const props = defineProps<{ orders: OwnerOrder[]; loading: boolean }>()
const emit = defineEmits<{
  accept: [orderId: string]
  complete: [orderId: string]
  refresh: []
}>()

function formatTime(timestamp: number) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatPrice(total: number) {
  if (!total) return '¥0'
  return `¥${(total / 100).toFixed(0)}`
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    submitted: '已提交',
    accepted: '已接单',
    completed: '已完成'
  }
  return map[status] || status
}
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">待处理订单</h2>
      <button class="ghost" type="button" @click="emit('refresh')">刷新</button>
    </header>
    <div class="card-body">
      <div v-if="props.loading" class="empty">订单加载中...</div>
      <div v-else-if="!props.orders.length" class="empty">暂无订单，稍后再来看看。</div>
      <div v-for="order in props.orders" :key="order.id" class="order-item">
        <div>
          <p class="order-id">{{ order.id }}</p>
          <p class="order-meta">
            {{ formatTime(order.created_at) }} · {{ formatPrice(order.total_price) }}
          </p>
        </div>
        <div class="order-actions">
          <span class="order-status">{{ formatStatus(order.status) }}</span>
          <button
            v-if="order.status === 'submitted'"
            class="order-button"
            type="button"
            @click="emit('accept', order.id)"
          >
            接单
          </button>
          <button
            v-else-if="order.status === 'accepted'"
            class="order-button"
            type="button"
            @click="emit('complete', order.id)"
          >
            完成
          </button>
        </div>
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
  margin-bottom: 12px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.card-body {
  display: grid;
  gap: 10px;
}

.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f5f1ff;
}

.order-id {
  margin: 0 0 4px;
  font-weight: 600;
}

.order-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.order-actions {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.order-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--color-border);
}

.order-button {
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
}

.empty {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
