<script setup lang="ts">
const stats = [
  { label: '今日订单', value: '12' },
  { label: '完成率', value: '92%' },
  { label: '评价数', value: '36' }
]
</script>

<template>
  <section class="stats">
    <div v-for="stat in stats" :key="stat.label" class="stat-card">
      <p class="stat-label">{{ stat.label }}</p>
      <p class="stat-value">{{ stat.value }}</p>
    </div>
  </section>
</template>

<style scoped>
.stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.stat-card {
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 14px 16px;
  background: #fdfbf7;
}

.stat-label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--color-muted);
}

.stat-value {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-strong);
}
</style>
