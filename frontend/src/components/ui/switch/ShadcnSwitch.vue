<script setup>
import { SwitchRoot, SwitchThumb } from 'radix-vue'

const props = defineProps({
  modelValue: Boolean,
  label: String,
  checkedText: String,
  uncheckedText: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="shadcn-switch" :class="{ disabled }">
    <SwitchRoot
      :checked="modelValue"
      :disabled="disabled"
      class="switch-root"
      @update:checked="emit('update:modelValue', $event)"
    >
      <SwitchThumb class="switch-thumb" />
    </SwitchRoot>
    <span v-if="label || checkedText || uncheckedText" class="switch-label">
      {{ label || (modelValue ? checkedText : uncheckedText) }}
    </span>
  </label>
</template>

<style scoped>
.shadcn-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.switch-root {
  width: 44px;
  height: 24px;
  background-color: var(--nb-gray-300);
  border-radius: 12px;
  position: relative;
  transition: background-color 0.15s ease;
  border: none;
  cursor: pointer;
}

.switch-root[data-state="checked"] {
  background-color: var(--nb-primary);
}

.switch-thumb {
  display: block;
  width: 20px;
  height: 20px;
  background-color: var(--nb-white);
  border-radius: 10px;
  transition: transform 0.15s ease;
  transform: translateX(2px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.switch-root[data-state="checked"] .switch-thumb {
  transform: translateX(22px);
}

.switch-label {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 14px;
  color: var(--nb-foreground);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled .switch-root {
  cursor: not-allowed;
}
</style>
