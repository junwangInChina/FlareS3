<script setup>
import { RadioGroupItem, RadioGroupRoot } from 'radix-vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  name: String,
  disabled: Boolean
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
    <label
      v-for="opt in options"
      :key="opt.value"
      class="radio-label"
      :class="{ disabled }"
    >
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
  font-size: 14px;
}

.radio-item {
  width: 20px;
  height: 20px;
  border: 2px solid var(--nb-gray-400);
  border-radius: 50%;
  margin-right: 8px;
  position: relative;
  background: var(--nb-surface);
  transition: border-color 0.15s ease;
  cursor: pointer;
}

.radio-item:hover {
  border-color: var(--nb-primary);
}

.radio-item[data-state="checked"] {
  border-color: var(--nb-primary);
}

.radio-indicator {
  width: 10px;
  height: 10px;
  background: var(--nb-primary);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.15s ease;
}

.radio-item[data-state="checked"] .radio-indicator {
  transform: translate(-50%, -50%) scale(1);
}

.radio-text {
  color: var(--nb-foreground);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled .radio-item {
  cursor: not-allowed;
}
</style>
