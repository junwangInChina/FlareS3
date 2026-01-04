<script setup>
defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'default'].includes(v),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v),
  },
  block: Boolean,
  disabled: Boolean,
  loading: Boolean,
})

defineEmits(['click'])
</script>

<template>
  <button
    class="shadcn-btn"
    :class="[`type-${type}`, `size-${size}`, { block, disabled, loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="loader"></span>
    <slot />
  </button>
</template>

<style scoped>
.shadcn-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
  line-height: 1;
  border: 1px solid transparent;
  border-radius: var(--nb-radius-md);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  white-space: nowrap;
  outline: none;
}

.shadcn-btn:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

/* Sizes */
.size-small {
  height: 36px;
  padding: 0 12px;
}

.size-medium {
  height: 40px;
  padding: 0 16px;
}

.size-large {
  height: 44px;
  padding: 0 32px;
}

/* Types */
.type-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  box-shadow: var(--nb-shadow);
}

.type-primary:hover:not(.disabled):not(.loading) {
  background-color: color-mix(in oklab, var(--primary) 90%, var(--background));
}

.type-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
  box-shadow: var(--nb-shadow-sm);
}

.type-secondary:hover:not(.disabled):not(.loading) {
  background-color: color-mix(in oklab, var(--secondary) 80%, var(--background));
}

.type-danger {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
  box-shadow: var(--nb-shadow-sm);
}

.type-danger:hover:not(.disabled):not(.loading) {
  background-color: color-mix(in oklab, var(--destructive) 90%, var(--background));
}

.type-ghost {
  background-color: transparent;
  border-color: transparent;
  color: var(--foreground);
}

.type-ghost:hover:not(.disabled):not(.loading) {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.type-default {
  background-color: var(--background);
  color: var(--foreground);
  border-color: var(--input);
  box-shadow: var(--nb-shadow-sm);
}

.type-default:hover:not(.disabled):not(.loading) {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.block {
  display: flex;
  width: 100%;
}

.disabled,
.loading {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.shadcn-btn :deep(svg) {
  pointer-events: none;
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
}

.loader {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
