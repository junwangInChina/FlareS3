<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalProgress from './BrutalProgress.vue'
import ShadcnProgress from './ShadcnProgress.vue'

const props = defineProps({
  percentage: { type: Number, default: 0 },
  type: { type: String, default: 'line' },
  showIndicator: { type: Boolean, default: true },
  color: String,
  height: { type: Number, default: 24 }
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnProgress : BrutalProgress
})
</script>

<template>
  <component :is="currentComponent" v-bind="props">
    <slot />
  </component>
</template>
