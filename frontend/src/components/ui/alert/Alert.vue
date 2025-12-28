<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalAlert from './BrutalAlert.vue'
import ShadcnAlert from './ShadcnAlert.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'error'].includes(v)
  },
  title: String,
  closable: Boolean
})

const emit = defineEmits(['close'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnAlert : BrutalAlert
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @close="emit('close')"
  >
    <slot />
  </component>
</template>
