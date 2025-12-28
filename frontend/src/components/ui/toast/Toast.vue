<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalToast from './BrutalToast.vue'
import ShadcnToast from './ShadcnToast.vue'

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnToast : BrutalToast
})
</script>

<template>
  <component :is="currentComponent" />
</template>
