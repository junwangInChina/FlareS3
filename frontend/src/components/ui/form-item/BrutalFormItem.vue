<script setup>
defineProps({
  label: String,
})
</script>

<template>
  <div class="brutal-form-item">
    <label v-if="label" class="form-label">{{ label }}</label>
    <div class="form-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.brutal-form-item {
  margin-bottom: var(--nb-space-lg);
}

.form-label {
  display: block;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  margin-bottom: var(--nb-space-xs);
}

.form-content {
  width: 100%;
}
</style>
