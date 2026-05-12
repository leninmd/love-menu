<script setup lang="ts">
const highlights = [
  '扫码进入专属菜单',
  '一句话完成下单',
  '状态实时可追踪'
]

const emit = defineEmits<{
  customer: []
  owner: []
}>()
</script>

<template>
  <section class="hero">
    <div class="hero-content">
      <p class="hero-tag">情侣专属菜单体验</p>
      <h1 class="hero-title">把“今天吃什么”变成一场专属点餐</h1>
      <p class="hero-subtitle">
        轻量 Web 应用，店主备菜、顾客点单，一条链接即可开始。
      </p>
      <div class="hero-actions">
        <button class="primary" type="button" @click="emit('owner')">
          创建我的餐厅
        </button>
        <button class="ghost" type="button" @click="emit('customer')">
          打开已有菜单
        </button>
      </div>
    </div>
    <ul class="hero-highlights">
      <li v-for="item in highlights" :key="item" class="highlight-item">
        <span class="dot"></span>
        <span>{{ item }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  gap: 32px;
  padding: 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, #fef7f1, #f2f7ff);
  border: 1px solid var(--color-border);
}

.hero-content {
  max-width: 680px;
}

.hero-tag {
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(32px, 4vw, 52px);
  margin: 0 0 12px;
  color: var(--color-text-strong);
}

.hero-subtitle {
  margin: 0 0 24px;
  font-size: 18px;
  color: var(--color-muted);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary,
.ghost {
  padding: 12px 20px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.primary {
  background: var(--color-accent);
  color: #fff;
}

.ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-strong);
}

.hero-highlights {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--color-text-strong);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-accent);
}
</style>
