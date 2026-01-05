<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'
import BrutalModal from './BrutalModal.vue'
import ShadcnModal from './ShadcnModal.vue'

const props = defineProps({
  show: Boolean,
  title: String,
  width: { type: String, default: '500px' },
})

const emit = defineEmits(['update:show', 'close'])

const themeStore = useThemeStore()
const currentComponent = computed(() => {
  return themeStore.uiTheme === 'shadcn' ? ShadcnModal : BrutalModal
})
</script>

<template>
  <component
    :is="currentComponent"
    v-bind="props"
    @update:show="emit('update:show', $event)"
    @close="emit('close')"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </component>
</template>
