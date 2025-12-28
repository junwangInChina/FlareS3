<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalTag from './BrutalTag.vue'
import ShadcnTag from './ShadcnTag.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium'].includes(v)
  }
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnTag : BrutalTag
})
</script>

<template>
  <component :is="currentComponent" v-bind="props">
    <slot />
  </component>
</template>
