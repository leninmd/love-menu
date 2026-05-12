<script setup lang="ts">
const props = defineProps<{
  sources: string[]
}>()

const iconMap: Record<string, string> = {
  美团: 'MEI',
  美团外卖: 'WM',
  京东到家: 'JD+',
  京东: 'JD',
  抖音: 'DY',
  淘宝: 'TB'
}

function label(source: string) {
  return iconMap[source] || source.slice(0, 2)
}
</script>

<template>
  <span class="icons">
    <span v-for="source in props.sources" :key="source" class="icon" :title="source">
      {{ label(source) }}
    </span>
  </span>
</template>

<style scoped>
.icons {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.icon {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--color-border);
}
</style>
