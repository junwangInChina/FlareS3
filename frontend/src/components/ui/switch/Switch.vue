<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalSwitch from './BrutalSwitch.vue'
import ShadcnSwitch from './ShadcnSwitch.vue'

const props = defineProps({
  modelValue: Boolean,
  label: String,
  checkedText: String,
  uncheckedText: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnSwitch : BrutalSwitch
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
