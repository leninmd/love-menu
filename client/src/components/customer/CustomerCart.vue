<script setup lang="ts">
interface CartItem {
  id: string
  dish_id: string
  quantity: number
  name: string
}

const props = defineProps<{
  items: CartItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  update: [itemId: string, quantity: number]
  remove: [itemId: string]
  submit: []
}>()

function increase(item: CartItem) {
  emit('update', item.id, item.quantity + 1)
}

function decrease(item: CartItem) {
  const next = item.quantity - 1
  if (next <= 0) {
    emit('remove', item.id)
  } else {
    emit('update', item.id, next)
  }
}
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">我的购物车</h2>
      <span class="card-count">{{ items.length }} 道菜</span>
    </header>
    <div class="card-body">
      <div v-if="loading" class="empty">购物车加载中...</div>
      <div v-else-if="!items.length" class="empty">还没有点菜，去菜单看看吧。</div>
      <div v-for="item in items" :key="item.id" class="cart-item">
        <div>
          <p class="cart-name">{{ item.name }}</p>
          <p class="cart-meta">数量：{{ item.quantity }}</p>
        </div>
        <div class="cart-actions">
          <button class="cart-button" type="button" @click="decrease(item)">
            -
          </button>
          <button class="cart-button" type="button" @click="increase(item)">
            +
          </button>
        </div>
      </div>
      <button
        class="primary"
        type="button"
        :disabled="loading || !items.length"
        @click="emit('submit')"
      >
        提交订单
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 16px;
  background: var(--color-surface);
  display: grid;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.card-count {
  font-size: 12px;
  color: var(--color-muted);
}

.card-body {
  display: grid;
  gap: 10px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff3e6;
}

.cart-name {
  margin: 0 0 4px;
  font-weight: 600;
}

.cart-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.cart-button {
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.cart-actions {
  display: flex;
  gap: 6px;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
