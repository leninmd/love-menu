<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import SourceIcons from '../shared/SourceIcons.vue'
interface Dish {
  id: string
  category_id?: string | null
  name: string
  price?: number | null
  sources?: string | null
}

interface Category {
  id: string
  name: string
}

const props = defineProps<{
  categories: Category[]
  dishes: Dish[]
  search: string
}>()

const emit = defineEmits<{
  add: [dishId: string]
}>()

function formatPrice(price?: number | null) {
  if (!price) return '未定价'
  return `¥${(price / 100).toFixed(0)}`
}

function parseSources(value?: string | null) {
  if (!value) return []
  return value
    .split(/[,/|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const toast = shallowRef('')
let toastTimer: number | null = null

async function copyDishName(name: string) {
  try {
    await navigator.clipboard.writeText(name)
    toast.value = `已复制：${name}`
  } catch {
    toast.value = '复制失败，请手动复制'
  }
  if (toastTimer) {
    window.clearTimeout(toastTimer)
  }
  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = null
  }, 2000)
}

const searchTerm = computed(() => props.search.trim())

const filteredDishes = computed(() => {
  if (!searchTerm.value) return props.dishes
  return props.dishes.filter((dish) => dish.name.includes(searchTerm.value))
})

const grouped = computed(() => {
  const map = new Map<string, Dish[]>()
  for (const dish of filteredDishes.value) {
    const bucket = dish.category_id || 'uncategorized'
    if (!map.has(bucket)) map.set(bucket, [])
    map.get(bucket)?.push(dish)
  }
  return map
})

const filteredCategories = computed(() => {
  if (!searchTerm.value) {
    return props.categories
  }
  const matches = new Set<string>(grouped.value.keys())
  return props.categories.filter((category) => matches.has(category.id))
})

const filteredUncategorized = computed(
  () => grouped.value.get('uncategorized') || []
)

onBeforeUnmount(() => {
  if (toastTimer) {
    window.clearTimeout(toastTimer)
    toastTimer = null
  }
})
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">菜单浏览</h2>
    </header>
    <div class="card-body">
       <div v-if="!dishes.length" class="empty">菜单空空的，等店主上新吧。</div>
      <div v-for="category in filteredCategories" :key="category.id" class="category">
        <h3 class="category-title">{{ category.name }}</h3>
         <div v-if="!grouped.value.get(category.id)?.length" class="empty">
           这个分类还没有菜品
         </div>
        <div v-else class="dish-list">
          <div
            v-for="dish in grouped.value.get(category.id) || []"
            :key="dish.id"
            class="dish-item"
          >
            <div>
              <p class="dish-name">{{ dish.name }}</p>
              <p class="dish-meta">
                来源：
                <span v-if="!parseSources(dish.sources).length">未标记</span>
                <span v-else class="source-list">
                  <button
                    class="source-chip"
                    type="button"
                    @click="copyDishName(dish.name)"
                  >
                    <SourceIcons :sources="parseSources(dish.sources)" />
                  </button>
                </span>
              </p>
            </div>
            <div class="dish-right">
              <span class="dish-price">{{ formatPrice(dish.price) }}</span>
              <button
                class="dish-button"
                type="button"
                @click="emit('add', dish.id)"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredUncategorized.length" class="category">
        <h3 class="category-title">未分类</h3>
        <div class="dish-list">
          <div v-for="dish in filteredUncategorized" :key="dish.id" class="dish-item">
            <div>
              <p class="dish-name">{{ dish.name }}</p>
              <p class="dish-meta">
                来源：
                <span v-if="!parseSources(dish.sources).length">未标记</span>
                <span v-else class="source-list">
                  <button
                    class="source-chip"
                    type="button"
                    @click="copyDishName(dish.name)"
                  >
                    <SourceIcons :sources="parseSources(dish.sources)" />
                  </button>
                </span>
              </p>
            </div>
            <div class="dish-right">
              <span class="dish-price">{{ formatPrice(dish.price) }}</span>
              <button
                class="dish-button"
                type="button"
                @click="emit('add', dish.id)"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
       <p v-if="searchTerm && !filteredDishes.length" class="empty">
         没找到匹配菜品，换个关键词试试
       </p>
      <p v-if="toast" class="toast" role="status" aria-live="polite">
        {{ toast }}
      </p>
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
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.card-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  padding: 6px 12px;
}

.category {
  margin-bottom: 16px;
}

.category-title {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-muted);
}

.dish-list {
  display: grid;
  gap: 8px;
}

.dish-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff8f1;
}

.dish-name {
  margin: 0 0 4px;
  font-weight: 600;
}

.dish-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.source-list {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-chip {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  cursor: pointer;
}

.dish-right {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.dish-price {
  font-weight: 600;
  color: var(--color-text-strong);
}

.dish-button {
  border-radius: 999px;
  border: none;
  background: var(--color-accent);
  color: #fff;
  padding: 4px 12px;
  cursor: pointer;
}

.empty {
  font-size: 12px;
  color: var(--color-muted);
}

.toast {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-text-strong);
}
</style>
