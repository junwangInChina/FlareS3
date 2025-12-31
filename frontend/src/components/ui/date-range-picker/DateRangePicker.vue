<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from "../../../stores/theme"
import BrutalDateRangePicker from './BrutalDateRangePicker.vue'
import ShadcnDateRangePicker from './ShadcnDateRangePicker.vue'

const props = defineProps({
  startValue: { type: String, default: '' },
  endValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: Boolean,
  readonly: Boolean,
  size: { type: String, default: 'medium' },
  clearable: { type: Boolean, default: false },
  numberOfMonths: { type: Number, default: 2 },
})

const emit = defineEmits(['update:startValue', 'update:endValue'])

const themeStore = useThemeStore()
const { t } = useI18n({ useScope: 'global' })
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnDateRangePicker : BrutalDateRangePicker
})

const forwardedProps = computed(() => ({
  ...props,
  placeholder: props.placeholder || t('dateRange.placeholder'),
}))
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="forwardedProps"
    @update:start-value="emit('update:startValue', $event)"
    @update:end-value="emit('update:endValue', $event)"
  />
</template>
