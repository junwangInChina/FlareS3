<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalPagination from './BrutalPagination.vue'
import ShadcnPagination from './ShadcnPagination.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  siblingCount: { type: Number, default: 1 },
  showTotal: { type: Boolean, default: true },
  showPageSize: { type: Boolean, default: true },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50] },
  disabled: Boolean,
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnPagination : BrutalPagination
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:page="emit('update:page', $event)"
    @update:page-size="emit('update:pageSize', $event)"
  />
</template>
