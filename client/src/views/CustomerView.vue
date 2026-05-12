<script setup lang="ts">
import CustomerPanel from '../components/customer/CustomerPanel.vue'

defineProps<{ mode: 'customer' | 'owner' }>()
</script>

<template>
  <CustomerPanel />
</template>
