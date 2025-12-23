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
  font-family: var(--nb-font-sans);
  font-weight: 600;
  text-transform: none;
  letter-spacing: -0.2px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  cursor: pointer;
  transition: var(--nb-transition);
  position: relative;
}

/* Sizes */
.size-small {
  padding: 6px 12px;
  font-size: 12px;
  box-shadow: var(--nb-shadow-sm);
}

.size-medium {
  padding: 12px 24px;
  font-size: 14px;
  box-shadow: var(--nb-shadow);
}

.size-large {
  padding: 16px 32px;
  font-size: 16px;
  box-shadow: var(--nb-shadow-lg);
}

/* Types */
.type-primary {
  background-color: var(--nb-black);
  color: var(--nb-white);
  border-color: var(--nb-black);
}

.type-secondary {
  background-color: var(--nb-gray-100);
  color: var(--nb-black);
  border-color: var(--nb-gray-300);
}

.type-danger {
  background-color: var(--nb-danger);
  color: var(--nb-white);
  border-color: var(--nb-danger);
}

.type-ghost {
  background-color: transparent;
  box-shadow: none;
  border-color: transparent;
  color: var(--nb-black);
}

.type-ghost:hover {
  border-color: var(--nb-gray-300);
  background-color: var(--nb-gray-100);
}

.type-default {
  background-color: var(--nb-white);
  color: var(--nb-black);
  border-color: var(--nb-gray-300);
}

/* States */
.brutal-btn:not(.type-ghost):not(.disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--nb-shadow);
}

.brutal-btn:not(.type-ghost):not(.disabled):active {
  transform: translateY(0);
  box-shadow: var(--nb-shadow-sm);
}

.block {
  display: flex;
  width: 100%;
}

.disabled,
.loading {
  opacity: 0.5;
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
