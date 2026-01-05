<script setup>
defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium'].includes(v),
  },
})
</script>

<template>
  <span class="brutal-tag" :class="[`type-${type}`, `size-${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.brutal-tag {
  display: inline-block;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
  border: var(--nb-border);
  background-color: var(--nb-surface);
  border-radius: var(--nb-radius);
}

.size-small {
  padding: 2px 6px;
  font-size: 10px;
}

.size-medium {
  padding: 4px 10px;
  font-size: 12px;
}

.type-primary {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground, var(--nb-ink));
  border-color: var(--nb-primary-border, var(--nb-ink));
}
.type-success {
  background-color: var(--nb-success);
  color: var(--nb-success-foreground, var(--nb-ink));
  border-color: var(--nb-success-border, var(--nb-ink));
}
.type-warning {
  background-color: var(--nb-warning);
  color: var(--nb-warning-foreground, var(--nb-ink));
  border-color: var(--nb-warning-border, var(--nb-ink));
}
.type-danger {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground, var(--nb-white));
  border-color: var(--nb-danger-border, var(--nb-ink));
}
.type-info {
  background-color: var(--nb-info);
  color: var(--nb-info-foreground, var(--nb-ink));
  border-color: var(--nb-info-border, var(--nb-ink));
}
</style>
