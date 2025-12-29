<script setup>
defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium'].includes(v)
  }
})
</script>

<template>
  <span class="shadcn-tag" :class="[`type-${type}`, `size-${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.shadcn-tag {
  display: inline-flex;
  align-items: center;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  border: 1px solid transparent;
  border-radius: 9999px;
  white-space: nowrap;
  line-height: 1;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.size-small {
  padding: 2px 8px;
  font-size: 0.75rem;
}

.size-medium {
  padding: 2px 10px;
  font-size: 0.75rem;
}

.type-default {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

.type-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.type-success {
  background-color: transparent;
  color: var(--nb-success);
  border-color: currentColor;
}

.type-warning {
  background-color: transparent;
  color: var(--nb-warning);
  border-color: currentColor;
}

.type-danger {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
}

.type-info {
  background-color: transparent;
  color: var(--nb-info);
  border-color: currentColor;
}

.type-default:hover {
  background-color: color-mix(in oklab, var(--secondary) 80%, var(--background));
}

.type-primary:hover {
  background-color: color-mix(in oklab, var(--primary) 90%, var(--background));
}

.type-danger:hover {
  background-color: color-mix(in oklab, var(--destructive) 90%, var(--background));
}
</style>
