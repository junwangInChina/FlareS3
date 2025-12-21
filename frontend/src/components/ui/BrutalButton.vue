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
  font-family: var(--nb-font-mono);
  font-weight: 700;
  text-transform: uppercase;
  border: var(--nb-border);
  cursor: pointer;
  transition: var(--nb-transition-fast);
  position: relative;
}

/* Sizes */
.size-small {
  padding: 6px 12px;
  font-size: 12px;
  box-shadow: 2px 2px 0 var(--nb-black);
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
  background-color: var(--nb-primary);
  color: var(--nb-black);
}

.type-secondary {
  background-color: var(--nb-secondary);
  color: var(--nb-black);
}

.type-danger {
  background-color: var(--nb-danger);
  color: var(--nb-white);
}

.type-ghost {
  background-color: transparent;
  box-shadow: none;
  border-color: transparent;
}

.type-ghost:hover {
  border-color: var(--nb-black);
  background-color: var(--nb-gray-100);
}

.type-default {
  background-color: var(--nb-white);
  color: var(--nb-black);
}

/* States */
.brutal-btn:not(.type-ghost):not(.disabled):hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--nb-black);
}

.brutal-btn:not(.type-ghost):not(.disabled):active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.block {
  display: flex;
  width: 100%;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading */
.loading {
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
