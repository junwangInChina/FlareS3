<script setup>
import { computed } from 'vue'
import { useThemeStore } from "../../../stores/theme"
import BrutalCard from './BrutalCard.vue'
import ShadcnCard from './ShadcnCard.vue'

const props = defineProps({
  title: String,
  headerBg: { type: String },
  headerColor: String
})

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnCard : BrutalCard
})
</script>

<template>
  <component :is="currentComponent" v-bind="props">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots['header-extra']" #header-extra>
      <slot name="header-extra" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </component>
</template>
