<script setup>
defineProps({
  label: String
})
</script>

<template>
  <div class="shadcn-form-item">
    <label v-if="label" class="form-label">{{ label }}</label>
    <div class="form-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.shadcn-form-item {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
  line-height: 1;
  color: var(--foreground);
  margin-bottom: 8px;
}

.form-content {
  width: 100%;
}
</style>
