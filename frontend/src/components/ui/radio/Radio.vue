<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalRadio from './BrutalRadio.vue'
import ShadcnRadio from './ShadcnRadio.vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  name: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnRadio : BrutalRadio
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
