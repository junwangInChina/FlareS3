<script setup>
import { computed, useAttrs } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalTooltip from './BrutalTooltip.vue'
import ShadcnTooltip from './ShadcnTooltip.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  content: String,
  text: String,
  maxWidth: { type: String, default: '300px' },
  disabled: { type: Boolean, default: false },
})

const attrs = useAttrs()
const themeStore = useThemeStore()
const isShadcn = computed(() => themeStore.uiTheme === 'shadcn')
const currentComponent = computed(() => (isShadcn.value ? ShadcnTooltip : BrutalTooltip))

const tooltipContent = computed(() => props.content || props.text)
const tooltipDisabled = computed(() => props.disabled || !tooltipContent.value)

const componentProps = computed(() => {
  if (isShadcn.value) {
    return { content: tooltipContent.value, maxWidth: props.maxWidth }
  }

  return { text: tooltipContent.value, maxWidth: props.maxWidth }
})

const mergedProps = computed(() => ({ ...attrs, ...componentProps.value }))
</script>

<template>
  <slot v-if="tooltipDisabled" />
  <component v-else :is="currentComponent" v-bind="mergedProps">
    <slot />
  </component>
</template>
