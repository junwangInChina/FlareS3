<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalTable from './BrutalTable.vue'
import ShadcnTable from './ShadcnTable.vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  loading: Boolean,
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnTable : BrutalTable
})
</script>

<template>
  <component :is="currentComponent" v-bind="props" />
</template>
