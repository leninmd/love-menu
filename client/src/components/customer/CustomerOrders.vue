<script setup lang="ts">
import { shallowRef } from 'vue'
import { fetchOrderItems, submitReview } from '../../api/client'

interface OrderItem {
  id: string
  status: string
  created_at: number
}

interface OrderDishItem {
  id: string
  dish_name: string
  quantity: number
  is_reviewed: number
}

const props = defineProps<{ orders: OrderItem[]; loading: boolean; token: string }>()
const emit = defineEmits<{ refresh: [] }>()

const expandedOrderId = shallowRef('')
const orderItems = shallowRef<OrderDishItem[]>([])
const reviewContent = shallowRef('')
const reviewError = shallowRef('')
const reviewLoading = shallowRef(false)

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

async function toggleReview(orderId: string, status: string) {
  if (status !== 'completed') return
  if (expandedOrderId.value === orderId) {
    expandedOrderId.value = ''
    orderItems.value = []
    return
  }
  reviewError.value = ''
  expandedOrderId.value = orderId
  try {
    const data = await fetchOrderItems(props.token, orderId)
    orderItems.value = data.items
  } catch (err) {
    reviewError.value = err instanceof Error ? err.message : '加载评价失败'
  }
}

async function handleSubmitReview(itemId: string) {
  if (!reviewContent.value.trim()) {
    reviewError.value = '请输入评价内容'
    return
  }
  reviewLoading.value = true
  reviewError.value = ''
  try {
    await submitReview(
      props.token,
      expandedOrderId.value,
      itemId,
      reviewContent.value.trim()
    )
    reviewContent.value = ''
    const data = await fetchOrderItems(props.token, expandedOrderId.value)
    orderItems.value = data.items
  } catch (err) {
    reviewError.value = err instanceof Error ? err.message : '提交评价失败'
  } finally {
    reviewLoading.value = false
  }
}
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">订单进度</h2>
      <button class="ghost" type="button" @click="emit('refresh')">刷新</button>
    </header>
    <div class="card-body">
      <div v-if="props.loading" class="empty">订单加载中...</div>
      <div v-else-if="!props.orders.length" class="empty">还没有订单，去点几道吧。</div>
      <div v-for="order in props.orders" :key="order.id" class="order-item">
        <div>
          <p class="order-id">{{ order.id }}</p>
          <p class="order-time">{{ formatTime(order.created_at) }}</p>
        </div>
        <div class="order-actions">
          <span class="order-status">{{ formatStatus(order.status) }}</span>
          <button
            v-if="order.status === 'completed'"
            class="ghost"
            type="button"
            @click="toggleReview(order.id, order.status)"
          >
            评价
          </button>
        </div>
      </div>
      <div v-if="expandedOrderId" class="review-panel">
        <p class="review-title">订单评价</p>
        <p v-if="reviewError" class="empty">{{ reviewError }}</p>
        <div v-for="item in orderItems" :key="item.id" class="review-item">
          <div>
            <p class="review-name">{{ item.dish_name }}</p>
            <p class="review-meta">数量：{{ item.quantity }}</p>
          </div>
          <button
            class="ghost"
            type="button"
            :disabled="item.is_reviewed === 1 || reviewLoading"
            @click="handleSubmitReview(item.id)"
          >
            {{ item.is_reviewed === 1 ? '已评价' : '提交评价' }}
          </button>
        </div>
        <textarea
          v-model="reviewContent"
          class="review-input"
          placeholder="写下 200 字以内评价"
          maxlength="200"
        />
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
  background: #f3f6ff;
}

.order-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.order-id {
  margin: 0 0 4px;
  font-weight: 600;
}

.order-time {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.order-status {
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

.review-panel {
  border: 1px dashed var(--color-border);
  border-radius: 16px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.review-title {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-strong);
}

.review-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.review-name {
  margin: 0 0 4px;
  font-weight: 600;
}

.review-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.review-input {
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 8px 10px;
  min-height: 80px;
  resize: vertical;
}
</style>
