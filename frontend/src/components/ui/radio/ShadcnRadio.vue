<script setup>
import { RadioGroupItem, RadioGroupRoot } from 'radix-vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  name: String,
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <RadioGroupRoot
    :model-value="String(modelValue)"
    :disabled="disabled"
    class="shadcn-radio-group"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <label v-for="opt in options" :key="opt.value" class="radio-label" :class="{ disabled }">
      <RadioGroupItem :value="String(opt.value)" class="radio-item">
        <div class="radio-indicator"></div>
      </RadioGroupItem>
      <span class="radio-text">{{ opt.label }}</span>
    </label>
  </RadioGroupRoot>
</template>

<style scoped>
.shadcn-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
}

.radio-item {
  width: 16px;
  height: 16px;
  border: 1px solid var(--primary);
  border-radius: 9999px;
  margin-right: 8px;
  position: relative;
  background: var(--background);
  color: var(--primary);
  transition:
    box-shadow 0.15s ease,
    opacity 0.15s ease;
  cursor: pointer;
}

.radio-item:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

.radio-indicator {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 9999px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.15s ease;
}

.radio-item[data-state='checked'] .radio-indicator {
  transform: translate(-50%, -50%) scale(1);
}

.radio-text {
  color: var(--foreground);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled .radio-item {
  cursor: not-allowed;
}
</style>
