<script setup>
defineProps({
  text: String,
  maxWidth: { type: String, default: '300px' }
})
</script>

<template>
  <span class="tooltip-wrapper" :data-tooltip="text">
    <slot />
  </span>
</template>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: block;
  max-width: 100%;
  cursor: help;
}

.tooltip-wrapper[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 6px 12px;
  background-color: var(--nb-black);
  color: var(--nb-white);
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
  border-radius: var(--nb-radius-sm);
  box-shadow: var(--nb-shadow-lg);
  z-index: 1000;
  max-width: v-bind(maxWidth);
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease-out;
}

.tooltip-wrapper[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 2px;
  border: 6px solid transparent;
  border-top-color: var(--nb-black);
  z-index: 1000;
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease-out;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* shadcn/ui theme: Lighter tooltip */
:root[data-ui-theme="shadcn"] .tooltip-wrapper[data-tooltip]:hover::after {
  background-color: var(--nb-gray-600);
  color: var(--nb-white);
  font-weight: 500;
}

:root[data-ui-theme="shadcn"] .tooltip-wrapper[data-tooltip]:hover::before {
  border-top-color: var(--nb-gray-600);
}
</style>
