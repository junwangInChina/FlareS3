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

/* Sizes */
.size-small {
  --btn-shadow: var(--nb-shadow-sm);
  padding: 0 14px;
  height: 36px;
  font-size: 14px;
}

.size-medium {
  --btn-shadow: var(--nb-shadow);
  padding: 0 22px;
  height: 44px;
  font-size: 16px;
}

.size-large {
  --btn-shadow: var(--nb-shadow-lg);
  padding: 0 26px;
  height: 52px;
  font-size: 16px;
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

.type-ghost {
  background-color: transparent;
  box-shadow: none;
  border-color: transparent;
  color: var(--nb-black);
}

.type-ghost:hover:not(.disabled):not(.loading) {
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

.brutal-btn:not(.disabled):not(.loading):active {
  transform: translate(0, 0);
  box-shadow: none;
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
}

.brutal-btn:disabled {
  cursor: not-allowed;
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
  to {
    transform: rotate(360deg);
  }
}
</style>
