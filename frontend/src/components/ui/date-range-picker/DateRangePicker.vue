<script setup>
import { computed } from 'vue'
import { useThemeStore } from "../../../stores/theme"
import BrutalDateRangePicker from './BrutalDateRangePicker.vue'
import ShadcnDateRangePicker from './ShadcnDateRangePicker.vue'

const props = defineProps({
  startValue: { type: String, default: '' },
  endValue: { type: String, default: '' },
  placeholder: { type: String, default: '开始日期 - 结束日期' },
  disabled: Boolean,
  readonly: Boolean,
  size: { type: String, default: 'medium' },
  clearable: { type: Boolean, default: false },
  numberOfMonths: { type: Number, default: 2 },
})

const emit = defineEmits(['update:startValue', 'update:endValue'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnDateRangePicker : BrutalDateRangePicker
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:start-value="emit('update:startValue', $event)"
    @update:end-value="emit('update:endValue', $event)"
  />
</template>

