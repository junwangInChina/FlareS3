<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalButton from './BrutalButton.vue'
import ShadcnButton from './ShadcnButton.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'default'].includes(v),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v),
  },
  block: Boolean,
  disabled: Boolean,
  loading: Boolean,
})

const emit = defineEmits(['click'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnButton : BrutalButton
})
</script>

<template>
  <component :is="currentComponent" v-bind="props" @click="emit('click', $event)">
    <slot />
  </component>
</template>
