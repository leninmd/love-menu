<script setup lang="ts">
const quickLinks = [
  { label: '菜单浏览', detail: '进入餐厅菜单' },
  { label: '我的购物车', detail: '查看已选菜品' },
  { label: '订单进度', detail: '跟踪状态更新' }
]

const ownerLinks = [
  { label: '待处理订单', detail: '接单与完成' },
  { label: '菜品管理', detail: '增删改菜品' },
  { label: '分类与等级', detail: '设置菜单结构' }
]
</script>

<template>
  <aside class="rail">
    <section class="rail-block">
      <h2 class="rail-title">顾客快速入口</h2>
      <div class="rail-list">
        <div v-for="item in quickLinks" :key="item.label" class="rail-item">
          <span class="rail-label">{{ item.label }}</span>
          <span class="rail-detail">{{ item.detail }}</span>
        </div>
      </div>
    </section>
    <section class="rail-block">
      <h2 class="rail-title">店主控制台</h2>
      <div class="rail-list">
        <div v-for="item in ownerLinks" :key="item.label" class="rail-item">
          <span class="rail-label">{{ item.label }}</span>
          <span class="rail-detail">{{ item.detail }}</span>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.rail {
  display: grid;
  gap: 20px;
}

.rail-block {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 20px;
}

.rail-title {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--color-text-strong);
}

.rail-list {
  display: grid;
  gap: 12px;
}

.rail-item {
  display: grid;
  gap: 4px;
}

.rail-label {
  font-weight: 600;
  font-size: 14px;
}

.rail-detail {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
