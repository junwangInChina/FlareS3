<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalDivider from './BrutalDivider.vue'
import ShadcnDivider from './ShadcnDivider.vue'

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnDivider : BrutalDivider
})
</script>

<template>
  <component :is="currentComponent" />
</template>
