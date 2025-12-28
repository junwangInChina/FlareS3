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
  font-size: 14px;
  color: var(--nb-foreground);
  margin-bottom: 6px;
}

.form-content {
  width: 100%;
}
</style>
