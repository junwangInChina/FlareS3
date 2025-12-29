<script setup>
import { computed, ref } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalToast from './BrutalToast.vue'
import ShadcnToast from './ShadcnToast.vue'

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnToast : BrutalToast
})

const innerRef = ref(null)

defineExpose({
  add: (message, type, duration) => innerRef.value?.add?.(message, type, duration),
  remove: (id) => innerRef.value?.remove?.(id),
  success: (message, duration) => innerRef.value?.success?.(message, duration),
  error: (message, duration) => innerRef.value?.error?.(message, duration),
  warning: (message, duration) => innerRef.value?.warning?.(message, duration),
  info: (message, duration) => innerRef.value?.info?.(message, duration)
})
</script>

<template>
  <component :is="currentComponent" ref="innerRef" />
</template>
