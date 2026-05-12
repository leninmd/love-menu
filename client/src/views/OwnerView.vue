<script setup lang="ts">
import OwnerPanel from '../components/owner/OwnerPanel.vue'

defineProps<{ mode: 'customer' | 'owner' }>()
</script>

<template>
  <OwnerPanel />
</template>
