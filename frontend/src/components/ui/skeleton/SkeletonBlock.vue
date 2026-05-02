<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: {
    type: [Number, String],
    default: '100%',
  },
  height: {
    type: [Number, String],
    default: 16,
  },
  radius: {
    type: [Number, String],
    default: '999px',
  },
})

const normalizeSize = (value) => (typeof value === 'number' ? `${value}px` : value)

const skeletonStyle = computed(() => ({
  width: normalizeSize(props.width),
  height: normalizeSize(props.height),
  borderRadius: normalizeSize(props.radius),
}))
</script>

<template>
  <span class="skeleton-block" :style="skeletonStyle" aria-hidden="true"></span>
</template>

<style scoped>
.skeleton-block {
  display: block;
  max-width: 100%;
  min-width: 0;
  flex: 0 1 auto;
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--nb-surface, #ffffff) 70%, transparent) 50%,
      transparent 100%
    ),
    color-mix(in srgb, var(--nb-border, #d4d4d8) 72%, var(--nb-surface, #ffffff));
  background-size: 220% 100%, 100% 100%;
  animation: skeleton-shimmer 1.15s ease-in-out infinite;
}

:root[data-ui-theme='shadcn'] .skeleton-block {
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in oklab, var(--background, #ffffff) 72%, transparent) 50%,
      transparent 100%
    ),
    color-mix(in oklab, var(--muted, #f1f5f9) 82%, var(--border, #e2e8f0));
  background-size: 220% 100%, 100% 100%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 120% 0, 0 0;
  }

  100% {
    background-position: -120% 0, 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
  }
}
</style>
