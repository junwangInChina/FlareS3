<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalSteps from './BrutalSteps.vue'
import ShadcnSteps from './ShadcnSteps.vue'

const props = defineProps({
  current: { type: Number, default: 1 },
  steps: { type: Array, default: () => [] },
  status: { type: String, default: 'process' },
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnSteps : BrutalSteps
})
</script>

<template>
  <component :is="currentComponent" v-bind="props" />
</template>
