<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalUpload from './BrutalUpload.vue'
import ShadcnUpload from './ShadcnUpload.vue'

const emit = defineEmits(['file-selected', 'before-upload'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnUpload : BrutalUpload
})
</script>

<template>
  <component
    :is="currentComponent"
    @file-selected="emit('file-selected', $event)"
    @before-upload="emit('before-upload', $event)"
  />
</template>
