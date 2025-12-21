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
  <span class="brutal-tag" :class="[`type-${type}`, `size-${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.brutal-tag {
  display: inline-block;
  font-family: var(--nb-font-mono);
  font-weight: 700;
  text-transform: uppercase;
  border: 2px solid var(--nb-black);
  background-color: var(--nb-white);
}

.size-small {
  padding: 2px 6px;
  font-size: 10px;
}

.size-medium {
  padding: 4px 10px;
  font-size: 12px;
}

.type-primary { background-color: var(--nb-primary); }
.type-success { background-color: var(--nb-success); }
.type-warning { background-color: var(--nb-warning); }
.type-danger { background-color: var(--nb-danger); color: var(--nb-white); }
.type-info { background-color: var(--nb-info); }
</style>
