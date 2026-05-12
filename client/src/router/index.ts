import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CustomerView from '../views/CustomerView.vue'
import OwnerView from '../views/OwnerView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/customer',
    name: 'customer',
    component: CustomerView
  },
  {
    path: '/owner',
    name: 'owner',
    component: OwnerView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.afterEach((to) => {
  if (to.name === 'home') return
  document.title = to.name === 'customer' ? '顾客端 - 恋上菜单' : '店主端 - 恋上菜单'
})

export default router
