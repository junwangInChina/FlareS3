<script setup>
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'radix-vue'

defineProps({
  content: String,
  maxWidth: { type: String, default: '300px' }
})
</script>

<template>
  <TooltipProvider>
    <TooltipRoot :delay-duration="200">
      <TooltipTrigger as-child>
        <span class="tooltip-trigger">
          <slot />
        </span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="tooltip-content" :side-offset="5" :style="{ maxWidth }">
          {{ content }}
          <TooltipArrow class="tooltip-arrow" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style scoped>
.tooltip-trigger {
  display: block;
  width: 100%;
}

.tooltip-content {
  padding: 6px 12px;
  background-color: var(--nb-gray-900);
  color: var(--nb-white);
  font-size: 13px;
  line-height: 1.4;
  border-radius: var(--nb-radius-sm);
  box-shadow: var(--nb-shadow-md);
  z-index: 1000;
  animation: slideDown 0.15s ease;
}

.tooltip-arrow {
  fill: var(--nb-gray-900);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
