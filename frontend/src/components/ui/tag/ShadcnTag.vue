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
  font-weight: 500;
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  white-space: nowrap;
}

.size-small {
  padding: 2px 8px;
  font-size: 11px;
}

.size-medium {
  padding: 3px 10px;
  font-size: 12px;
}

.type-default {
  background-color: var(--nb-gray-100);
  color: var(--nb-foreground);
  border-color: var(--nb-gray-300);
}

.type-primary {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground);
  border-color: var(--nb-primary);
}

.type-success {
  background-color: var(--nb-success);
  color: var(--nb-success-foreground);
  border-color: var(--nb-success);
}

.type-warning {
  background-color: var(--nb-warning);
  color: var(--nb-warning-foreground);
  border-color: var(--nb-warning);
}

.type-danger {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground);
  border-color: var(--nb-danger);
}

.type-info {
  background-color: var(--nb-info);
  color: var(--nb-info-foreground);
  border-color: var(--nb-info);
}
</style>
