<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppHero from './AppHero.vue'
import AppStatus from './AppStatus.vue'

const router = useRouter()

function goCustomer() {
  router.push('/customer')
}

function goOwner() {
  router.push('/owner')
}
</script>

<template>
  <div class="shell">
    <AppHero @customer="goCustomer" @owner="goOwner" />
    <AppStatus />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  gap: 32px;
}
</style>
