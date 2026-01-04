<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalDescriptions from './BrutalDescriptions.vue'
import ShadcnDescriptions from './ShadcnDescriptions.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  column: { type: Number, default: 2 },
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnDescriptions : BrutalDescriptions
})
</script>

<template>
  <component :is="currentComponent" v-bind="props" />
</template>
