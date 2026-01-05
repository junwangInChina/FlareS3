<script setup>
import { Comment, Text, computed, useSlots } from 'vue'
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'radix-vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  text: String,
  maxWidth: { type: String, default: '300px' },
  side: { type: String, default: 'top' },
  align: { type: String, default: 'center' },
  sideOffset: { type: Number, default: 4 },
  alignOffset: { type: Number, default: undefined },
  delayDuration: { type: Number, default: 200 },
})

const slots = useSlots()

const useDirectTrigger = computed(() => {
  const nodes = (slots.default?.() ?? []).filter((node) => {
    if (node.type === Comment) return false
    if (node.type !== Text) return true
    return typeof node.children !== 'string' || node.children.trim() !== ''
  })
  if (nodes.length !== 1) return false
  return typeof nodes[0].type === 'string'
})
</script>

<template>
  <TooltipProvider>
    <TooltipRoot :delay-duration="delayDuration">
      <TooltipTrigger as-child>
        <slot v-if="useDirectTrigger" />
        <span v-else class="brutal-tooltip-trigger">
          <slot />
        </span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="brutal-tooltip-content"
          :side="side"
          :align="align"
          :side-offset="sideOffset"
          :align-offset="alignOffset"
          :style="{ maxWidth }"
        >
          {{ props.text }}
          <TooltipArrow class="brutal-tooltip-arrow" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style scoped>
.brutal-tooltip-trigger {
  display: inline-flex;
  align-items: center;
}
</style>

<style>
:root[data-ui-theme='motherduck-neobrutalism'] .brutal-tooltip-content {
  padding: 6px 12px;
  background-color: var(--nb-black);
  color: var(--nb-white);
  font-size: 13px;
  line-height: 1.4;
  border-radius: var(--nb-radius);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow-lg);
  z-index: 1100;
  user-select: none;
}

:root[data-ui-theme='motherduck-neobrutalism'] .brutal-tooltip-arrow {
  fill: var(--nb-black);
  stroke: var(--nb-black);
  stroke-width: 1px;
}

:root[data-ui-theme='motherduck-neobrutalism'][data-theme='dark'] .brutal-tooltip-content {
  background-color: var(--nb-black);
  color: var(--nb-bg);
}
</style>
