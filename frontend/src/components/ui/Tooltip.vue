<script setup>
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'radix-vue'

defineProps({
  content: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  asChild: {
    type: Boolean,
    default: false
  },
  side: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'right', 'bottom', 'left'].includes(v)
  },
  align: {
    type: String,
    default: 'center',
    validator: (v) => ['start', 'center', 'end'].includes(v)
  },
  sideOffset: {
    type: Number,
    default: 4
  },
  delayDuration: {
    type: Number,
    default: 200
  }
})
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot v-if="asChild" />
        <span v-else class="tooltip-trigger">
          <slot />
        </span>
      </TooltipTrigger>
      <TooltipPortal v-if="!disabled && content" to="body">
        <TooltipContent
          :side="side"
          :align="align"
          :side-offset="sideOffset"
          class="tooltip-content"
        >
          {{ content }}
          <TooltipArrow class="tooltip-arrow" :width="8" :height="4" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style scoped>
.tooltip-trigger {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  cursor: help;
}

:deep(.tooltip-content) {
  z-index: 1000;
  border-radius: var(--nb-radius-sm, var(--nb-radius));
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--nb-white);
  background-color: var(--nb-ink);
  box-shadow: var(--nb-shadow-lg);
  max-width: 320px;
  white-space: normal;
  word-break: break-word;
  font-weight: 500;
}

/* shadcn/ui theme: Modern tooltip with border */
:root[data-ui-theme="shadcn"] :deep(.tooltip-content) {
  background-color: var(--nb-gray-600);
  color: var(--nb-white);
  border: 1px solid hsl(240 3.7% 15.9%);
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:deep(.tooltip-arrow) {
  fill: var(--nb-ink);
}

:root[data-ui-theme="shadcn"] :deep(.tooltip-arrow) {
  fill: var(--nb-gray-600);
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Radix Vue 默认样式覆盖 - 方向感知动画 */
:deep(.tooltip-content[data-state='delayed-open'][data-side='top']) {
  animation: tooltip-slide-down-fade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.tooltip-content[data-state='delayed-open'][data-side='bottom']) {
  animation: tooltip-slide-up-fade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.tooltip-content[data-state='delayed-open'][data-side='left']) {
  animation: tooltip-slide-right-fade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.tooltip-content[data-state='delayed-open'][data-side='right']) {
  animation: tooltip-slide-left-fade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes tooltip-slide-down-fade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tooltip-slide-up-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tooltip-slide-left-fade {
  from {
    opacity: 0;
    transform: translateX(4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes tooltip-slide-right-fade {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
