<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import {
  createCategory,
  createDish,
  deleteCategory,
  deleteDish,
  fetchOwnerMenu,
  updateCategory,
  updateDish,
  updateRestaurant,
  deleteRestaurant,
  uploadImage,
  fetchGuestLevels,
  updateGuestLevels
} from '../../api/client'
import type { GuestLevel } from '../../api/client'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface Dish {
  id: string
  name: string
  category_id: string | null
  description?: string | null
  price?: number | null
  image_url?: string | null
  sources?: string | null
  is_deleted: number
}

const props = defineProps<{
  token: string
  restaurantId: string
}>()

const emit = defineEmits<{
  deleted: []
}>()

const loading = shallowRef(false)
const error = shallowRef('')
const categories = shallowRef<Category[]>([])
const dishes = shallowRef<Dish[]>([])

const formCategoryName = shallowRef('')
const formCategorySort = shallowRef(0)

const formDishName = shallowRef('')
const formDishCategory = shallowRef('')
const formDishPrice = shallowRef('')
const formDishSources = shallowRef('')
const formDishDescription = shallowRef('')
const formDishImage = shallowRef<File | null>(null)

const restaurantName = shallowRef('')
const restaurantIntro = shallowRef('')
const shareCopied = shallowRef(false)

const guestLevels = shallowRef<{ title: string; minOrders: number }[]>([])
const newLevelTitle = shallowRef('')
const newLevelMinOrders = shallowRef('')

async function loadMenu() {
  if (!props.token || !props.restaurantId) return
  loading.value = true
  error.value = ''
  try {
    const data = await fetchOwnerMenu(props.token, props.restaurantId)
    categories.value = data.categories
    dishes.value = data.dishes
  } catch (err) {
    error.value = err instanceof Error ? err.message : '菜单加载失败'
  } finally {
    loading.value = false
  }
}

async function loadGuestLevels() {
  if (!props.restaurantId) return
  try {
    const data = await fetchGuestLevels(props.restaurantId)
    guestLevels.value = data.levels.map((l: GuestLevel) => ({
      title: l.title,
      minOrders: l.min_orders
    }))
  } catch {
    guestLevels.value = []
  }
}

async function handleSaveRestaurant() {
  if (!restaurantName.value.trim()) {
    error.value = '请输入餐厅名称'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await updateRestaurant(props.token, props.restaurantId, {
      name: restaurantName.value.trim(),
      intro: restaurantIntro.value.trim() || undefined
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    loading.value = false
  }
}

async function handleDeleteRestaurant() {
  if (!confirm('确认删除此餐厅？删除后将显示"已下线"')) return
  loading.value = true
  error.value = ''
  try {
    await deleteRestaurant(props.token, props.restaurantId)
    emit('deleted')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    loading.value = false
  }
}

function copyShareLink() {
  const base = window.location.origin
  const link = `${base}/customer?restaurant=${props.restaurantId}`
  navigator.clipboard.writeText(link).then(() => {
    shareCopied.value = true
    setTimeout(() => {
      shareCopied.value = false
    }, 2000)
  })
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  formDishImage.value = input.files[0]
}

async function handleCreateCategory() {
  if (!formCategoryName.value.trim()) {
    error.value = '请输入分类名称'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await createCategory(
      props.token,
      props.restaurantId,
      formCategoryName.value.trim(),
      formCategorySort.value
    )
    formCategoryName.value = ''
    formCategorySort.value = 0
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增分类失败'
  } finally {
    loading.value = false
  }
}

async function handleUpdateCategory(category: Category) {
  loading.value = true
  error.value = ''
  try {
    await updateCategory(
      props.token,
      props.restaurantId,
      category.id,
      category.name,
      category.sort_order
    )
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新分类失败'
  } finally {
    loading.value = false
  }
}

async function handleDeleteCategory(categoryId: string) {
  loading.value = true
  error.value = ''
  try {
    await deleteCategory(props.token, props.restaurantId, categoryId)
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除分类失败'
  } finally {
    loading.value = false
  }
}

async function handleCreateDish() {
  if (!formDishName.value.trim()) {
    error.value = '请输入菜名'
    return
  }
  loading.value = true
  error.value = ''
  try {
    let imageUrl: string | undefined
    if (formDishImage.value) {
      const result = await uploadImage(props.token, formDishImage.value)
      imageUrl = result.imageUrl
    }
    const priceValue = formDishPrice.value.trim()
    await createDish(props.token, props.restaurantId, {
      name: formDishName.value.trim(),
      categoryId: formDishCategory.value || null,
      description: formDishDescription.value.trim() || undefined,
      price: priceValue ? Number.parseInt(priceValue, 10) : null,
      sources: formDishSources.value.trim() || null,
      imageUrl
    })
    formDishName.value = ''
    formDishCategory.value = ''
    formDishPrice.value = ''
    formDishSources.value = ''
    formDishDescription.value = ''
    formDishImage.value = null
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '新增菜品失败'
  } finally {
    loading.value = false
  }
}

async function handleUpdateDish(dish: Dish) {
  loading.value = true
  error.value = ''
  try {
    await updateDish(props.token, props.restaurantId, dish.id, {
      name: dish.name,
      categoryId: dish.category_id,
      description: dish.description || undefined,
      price: dish.price ?? null,
      sources: dish.sources || null
    })
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新菜品失败'
  } finally {
    loading.value = false
  }
}

async function handleDeleteDish(dishId: string) {
  loading.value = true
  error.value = ''
  try {
    await deleteDish(props.token, props.restaurantId, dishId)
    await loadMenu()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除菜品失败'
  } finally {
    loading.value = false
  }
}

function addGuestLevel() {
  const title = newLevelTitle.value.trim()
  const minOrders = Number.parseInt(newLevelMinOrders.value, 10) || 0
  if (!title) return
  guestLevels.value.push({ title, minOrders })
  newLevelTitle.value = ''
  newLevelMinOrders.value = ''
}

function removeGuestLevel(index: number) {
  guestLevels.value.splice(index, 1)
}

async function saveGuestLevels() {
  loading.value = true
  error.value = ''
  try {
    await updateGuestLevels(props.token, props.restaurantId, guestLevels.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存等级失败'
  } finally {
    loading.value = false
  }
}

const activeDishes = computed(() =>
  dishes.value.filter((dish) => dish.is_deleted === 0)
)

onMounted(() => {
  loadMenu()
  loadGuestLevels()
})
</script>

<template>
  <section class="card">
    <header class="card-header">
      <div>
        <h2 class="card-title">厨房管理</h2>
        <p class="card-subtitle">餐厅设置、分类、菜品与食客等级</p>
      </div>
      <button class="ghost" type="button" @click="loadMenu">刷新</button>
    </header>

    <div class="card-body">
      <p v-if="loading" class="empty">加载中...</p>
      <p v-else-if="error" class="empty">{{ error }}</p>

      <section class="block">
        <h3 class="block-title">餐厅设置</h3>
        <div class="form-grid">
          <input v-model="restaurantName" class="input" placeholder="餐厅名称" />
          <input v-model="restaurantIntro" class="input" placeholder="简介（选填）" />
        </div>
        <div class="list-actions">
          <button class="primary" type="button" @click="handleSaveRestaurant">
            保存设置
          </button>
          <button class="ghost" type="button" @click="copyShareLink">
            {{ shareCopied ? '已复制' : '复制分享链接' }}
          </button>
          <button class="ghost ghost-danger" type="button" @click="handleDeleteRestaurant">
            删除餐厅
          </button>
        </div>
      </section>

      <section class="block">
        <h3 class="block-title">分类管理</h3>
        <div class="form-grid">
          <input v-model="formCategoryName" class="input" placeholder="分类名称" />
          <input v-model.number="formCategorySort" class="input" type="number" placeholder="排序" />
          <button class="primary" type="button" @click="handleCreateCategory">
            添加分类
          </button>
        </div>
        <div class="list">
          <div v-for="category in categories" :key="category.id" class="list-item">
            <input v-model="category.name" class="input" />
            <input v-model.number="category.sort_order" class="input" type="number" />
            <div class="list-actions">
              <button class="ghost" type="button" @click="handleUpdateCategory(category)">
                保存
              </button>
              <button class="ghost" type="button" @click="handleDeleteCategory(category.id)">
                删除
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h3 class="block-title">新增菜品</h3>
        <div class="form-grid">
          <input v-model="formDishName" class="input" placeholder="菜名" />
          <select v-model="formDishCategory" class="input">
            <option value="">未分类</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
          <input v-model="formDishPrice" class="input" placeholder="价格（分）" />
          <input v-model="formDishSources" class="input" placeholder="来源（逗号分隔）" />
          <input v-model="formDishDescription" class="input" placeholder="描述" />
          <label class="file-label">
            <input type="file" accept="image/*" @change="handleImageUpload" />
            <span class="file-text">{{ formDishImage ? formDishImage.name : '选择图片' }}</span>
          </label>
          <button class="primary" type="button" @click="handleCreateDish">添加菜品</button>
        </div>
        <div class="list">
          <div v-for="dish in activeDishes" :key="dish.id" class="list-item">
            <input v-model="dish.name" class="input" />
            <select v-model="dish.category_id" class="input">
              <option value="">未分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <input v-model="dish.price" class="input" placeholder="价格（分）" />
            <input v-model="dish.sources" class="input" placeholder="来源" />
            <div class="list-actions">
              <button class="ghost" type="button" @click="handleUpdateDish(dish)">保存</button>
              <button class="ghost" type="button" @click="handleDeleteDish(dish.id)">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h3 class="block-title">食客等级</h3>
        <div class="form-grid">
          <input v-model="newLevelTitle" class="input" placeholder="称号" />
          <input v-model="newLevelMinOrders" class="input" type="number" placeholder="最低下单次数" />
          <button class="primary" type="button" @click="addGuestLevel">添加等级</button>
        </div>
        <div class="list">
          <div v-for="(level, idx) in guestLevels" :key="idx" class="list-item">
            <input v-model="level.title" class="input" />
            <input v-model.number="level.minOrders" class="input" type="number" />
            <div class="list-actions">
              <button class="ghost" type="button" @click="removeGuestLevel(idx)">移除</button>
            </div>
          </div>
        </div>
        <button class="primary" type="button" @click="saveGuestLevels">保存等级</button>
      </section>
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
  gap: 12px;
  flex-wrap: wrap;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.card-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-muted);
}

.ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.ghost-danger {
  border-color: #c0392b;
  color: #c0392b;
}

.card-body {
  display: grid;
  gap: 12px;
}

.block {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #fff7ed;
}

.block-title {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-strong);
}

.form-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.input {
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 6px 10px;
}

.file-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.file-label input[type="file"] {
  display: none;
}

.file-text {
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-muted);
}

.list {
  display: grid;
  gap: 8px;
}

.list-item {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  align-items: center;
  background: #fff;
  border-radius: 14px;
  padding: 10px;
}

.list-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
}

.empty {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
