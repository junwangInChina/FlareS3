<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalFormItem from './BrutalFormItem.vue'
import ShadcnFormItem from './ShadcnFormItem.vue'

const props = defineProps({
  label: String,
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnFormItem : BrutalFormItem
})
</script>

<template>
  <component :is="currentComponent" v-bind="props">
    <slot />
  </component>
</template>
