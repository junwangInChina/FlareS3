<script setup>
defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] }, // [{ label, value }]
  label: String,
  placeholder: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="brutal-select-wrapper">
    <label v-if="label" class="select-label">{{ label }}</label>
    <div class="select-container">
      <select
        class="brutal-select"
        :value="modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <div class="select-arrow">▼</div>
    </div>
  </div>
</template>

<style scoped>
.brutal-select-wrapper {
  width: 100%;
}

.select-label {
  display: block;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  margin-bottom: var(--nb-space-xs);
}

.select-container {
  position: relative;
}

.brutal-select {
  width: 100%;
  appearance: none;
  padding: 12px 40px 12px 16px;
  font-family: var(--nb-font-sans);
  font-size: 16px;
  font-weight: 300;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-input-bg);
  color: var(--nb-black);
  cursor: pointer;
  box-shadow: none;
  transition: var(--nb-transition-fast);
}

/* shadcn/ui theme: Compact select */
:root[data-ui-theme="shadcn"] .brutal-select {
  padding: 8px 36px 8px 12px;
  font-size: 14px;
  font-weight: 400;
}

.brutal-select:focus {
  outline: none;
  border-color: var(--nb-deep-blue);
  box-shadow: var(--nb-focus-ring);
}

/* shadcn/ui theme: Subtle focus */
:root[data-ui-theme="shadcn"] .brutal-select:focus {
  border-color: var(--nb-primary);
  box-shadow: var(--nb-focus-ring);
}

.brutal-select:disabled {
  background-color: var(--nb-gray-200);
  color: var(--nb-gray-400);
  border-color: var(--nb-gray-400);
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 12px;
}
</style>
