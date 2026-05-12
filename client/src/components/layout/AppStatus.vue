<script setup lang="ts">
const cards = [
  {
    title: '当前进度',
    desc: '核心链路已打通，下一步进入前端联调。'
  },
  {
    title: '后端状态',
    desc: '菜单、购物车、订单接口已就绪。'
  },
  {
    title: '接下来',
    desc: '完成顾客端页面骨架并开始对接。'
  }
]
</script>

<template>
  <section class="status">
    <div v-for="card in cards" :key="card.title" class="status-card">
      <h2 class="status-title">{{ card.title }}</h2>
      <p class="status-desc">{{ card.desc }}</p>
    </div>
  </section>
</template>

<style scoped>
.status {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.status-card {
  border: 1px solid var(--color-border);
  padding: 20px;
  border-radius: 18px;
  background: var(--color-surface);
}

.status-title {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text-strong);
}

.status-desc {
  margin: 0;
  color: var(--color-muted);
}
</style>
