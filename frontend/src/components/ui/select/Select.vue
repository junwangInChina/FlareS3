<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalSelect from './BrutalSelect.vue'
import ShadcnSelect from './ShadcnSelect.vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  label: String,
  placeholder: String,
  disabled: Boolean,
  size: { type: String, default: 'medium' },
})

const emit = defineEmits(['update:modelValue'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnSelect : BrutalSelect
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
