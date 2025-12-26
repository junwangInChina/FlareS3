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
    class="brutal-btn"
    :class="[`type-${type}`, `size-${size}`, { block, disabled, loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="loader"></span>
    <slot />
  </button>
</template>

<style scoped>
.brutal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  cursor: pointer;
  transition: var(--nb-transition);
  position: relative;
  box-shadow: none;
  white-space: nowrap;
}

/* shadcn/ui theme: Modern button styling */
:root[data-ui-theme="shadcn"] .brutal-btn {
  gap: 4px;
  font-weight: 500;
}

/* Sizes */
.size-small {
  --btn-shadow: var(--nb-shadow-sm);
  padding: 10px 14px;
  font-size: 14px;
}

/* shadcn/ui theme: Compact small buttons */
:root[data-ui-theme="shadcn"] .size-small {
  padding: 6px 12px;
  font-size: 13px;
  height: 32px;
}

.size-medium {
  --btn-shadow: var(--nb-shadow);
  padding: 16px 22px;
  font-size: 16px;
}

:root[data-ui-theme="shadcn"] .size-medium {
  padding: 8px 16px;
  font-size: 14px;
  height: 36px;
}

.size-large {
  --btn-shadow: var(--nb-shadow-lg);
  padding: 18px 26px;
  font-size: 16px;
}

:root[data-ui-theme="shadcn"] .size-large {
  padding: 10px 20px;
  font-size: 15px;
  height: 40px;
}

/* Types */
.type-primary {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground, var(--nb-ink));
  border-color: var(--nb-primary-border, var(--nb-ink));
}

.type-secondary {
  background-color: var(--nb-secondary);
  color: var(--nb-secondary-foreground, var(--nb-ink));
  border-color: var(--nb-secondary-border, var(--nb-ink));
}

.type-danger {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground, var(--nb-white));
}

/* shadcn/ui theme: Outline danger button */
:root[data-ui-theme="shadcn"] .type-danger {
  background-color: transparent;
  color: var(--nb-danger);
  border-color: var(--nb-danger);
}

:root[data-ui-theme="shadcn"] .type-danger:hover:not(.disabled):not(.loading) {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground);
  opacity: 1;
}

.type-ghost {
  background-color: transparent;
  box-shadow: none;
  border-color: transparent;
  color: var(--nb-black);
}

.type-ghost:hover {
  border-color: var(--nb-border-color);
  background-color: var(--nb-gray-100);
}

.type-default {
  background-color: var(--nb-surface);
  color: var(--nb-black);
}

/* States */
.brutal-btn:not(.disabled):not(.loading):hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--btn-shadow);
}

/* shadcn/ui theme: Subtle hover effects */
:root[data-ui-theme="shadcn"] .brutal-btn:not(.disabled):not(.loading):hover {
  transform: none;
  opacity: 0.9;
}

:root[data-ui-theme="shadcn"] .type-primary:hover {
  opacity: 0.85;
}

:root[data-ui-theme="shadcn"] .type-default:hover {
  background-color: var(--nb-gray-100);
}

:root[data-ui-theme="shadcn"] .type-danger:hover {
  opacity: 0.85;
}

.brutal-btn:not(.disabled):not(.loading):active {
  transform: translate(0, 0);
  box-shadow: none;
}

:root[data-ui-theme="shadcn"] .brutal-btn:not(.disabled):not(.loading):active {
  opacity: 0.7;
}

.block {
  display: flex;
  width: 100%;
}

.disabled,
.loading {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  pointer-events: none;
}

.loader {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
