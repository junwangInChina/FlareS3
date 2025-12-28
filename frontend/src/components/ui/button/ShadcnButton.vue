<script setup>
defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'default'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  block: Boolean,
  disabled: Boolean,
  loading: Boolean
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
  gap: 6px;
  font-family: var(--nb-font-ui);
  font-weight: 500;
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  outline: none;
}

.shadcn-btn:focus-visible {
  outline: 2px solid var(--nb-primary);
  outline-offset: 2px;
}

/* Sizes */
.size-small {
  padding: 0 12px;
  height: 32px;
  font-size: 13px;
}

.size-medium {
  padding: 0 16px;
  height: 36px;
  font-size: 14px;
}

.size-large {
  padding: 0 20px;
  height: 40px;
  font-size: 14px;
}

/* Types */
.type-primary {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground);
  border-color: var(--nb-primary);
}

.type-primary:hover:not(.disabled):not(.loading) {
  opacity: 0.9;
}

.type-secondary {
  background-color: var(--nb-secondary);
  color: var(--nb-secondary-foreground);
  border-color: var(--nb-border-color);
}

.type-secondary:hover:not(.disabled):not(.loading) {
  background-color: var(--nb-gray-100);
}

.type-danger {
  background-color: transparent;
  color: var(--nb-danger);
  border-color: var(--nb-danger);
}

.type-danger:hover:not(.disabled):not(.loading) {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground);
}

.type-ghost {
  background-color: transparent;
  border-color: transparent;
  color: var(--nb-foreground);
}

.type-ghost:hover:not(.disabled):not(.loading) {
  background-color: var(--nb-gray-100);
}

.type-default {
  background-color: var(--nb-surface);
  color: var(--nb-foreground);
  border-color: var(--nb-border-color);
}

.type-default:hover:not(.disabled):not(.loading) {
  background-color: var(--nb-gray-50);
}

/* States */
.type-primary:active:not(.disabled):not(.loading),
.type-danger:active:not(.disabled):not(.loading) {
  opacity: 0.8;
}

.type-secondary:active:not(.disabled):not(.loading),
.type-default:active:not(.disabled):not(.loading),
.type-ghost:active:not(.disabled):not(.loading) {
  background-color: var(--nb-gray-200);
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

.loader {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
