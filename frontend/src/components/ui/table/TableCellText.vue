<script setup>
import { computed } from 'vue'
import Tooltip from '../tooltip/Tooltip.vue'

const props = defineProps({
  value: {
    type: [String, Number],
    default: '',
  },
  fallback: {
    type: String,
    default: '-',
  },
  tooltip: {
    type: String,
    default: undefined,
  },
  textClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const text = computed(() => {
  if (props.value == null) return props.fallback
  const normalized = String(props.value)
  return normalized.trim() ? normalized : props.fallback
})

const tooltipContent = computed(() => {
  if (props.tooltip !== undefined) return props.tooltip
  return text.value === props.fallback ? '' : text.value
})
</script>

<template>
  <Tooltip :content="tooltipContent">
    <span :class="['table-cell-text', textClass]">{{ text }}</span>
  </Tooltip>
</template>

<style scoped>
.table-cell-text {
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
