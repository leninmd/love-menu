<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import AppHeader from './AppHeader.vue'
import AppRail from './AppRail.vue'

const appStore = useAppStore()
const { mode } = storeToRefs(appStore)
</script>

<template>
  <div class="layout">
    <AppHeader />
    <main class="layout-main">
      <AppRail />
      <section class="layout-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :mode="mode" />
        </RouterView>
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
}

.layout-main {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 24px;
  padding: 32px clamp(20px, 5vw, 64px) 64px;
  flex: 1;
}

.layout-content {
  background: var(--color-surface);
  border-radius: 24px;
  border: 1px solid var(--color-border);
  padding: 28px;
  min-height: 420px;
}

@media (max-width: 960px) {
  .layout-main {
    grid-template-columns: 1fr;
  }
}
</style>
