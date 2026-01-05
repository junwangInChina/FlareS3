<script setup>
import { SwitchRoot, SwitchThumb } from 'radix-vue'

const props = defineProps({
  modelValue: Boolean,
  label: String,
  checkedText: String,
  uncheckedText: String,
  disabled: Boolean,
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

.switch-label {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
  color: var(--foreground);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled .switch-root {
  cursor: not-allowed;
}
</style>

<!-- Align with shadcn/ui Switch (default + neutral):
     https://ui.shadcn.com/docs/components/switch -->
<style>
:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  padding: 0;
  margin: 0;
  line-height: 0;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-color: var(--input);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  outline: none;
  appearance: none;
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root[data-state='checked'] {
  background-color: var(--primary);
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root[data-state='unchecked'] {
  background-color: var(--input);
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root[disabled],
:root[data-ui-theme='shadcn'] .shadcn-switch .switch-root[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-thumb {
  pointer-events: none;
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background-color: var(--background);
  box-shadow: var(--nb-shadow-lg);
  transition: transform 0.15s ease;
  transform: translateX(0);
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-thumb[data-state='checked'] {
  transform: translateX(20px);
}

:root[data-ui-theme='shadcn'] .shadcn-switch .switch-thumb[data-state='unchecked'] {
  transform: translateX(0);
}
</style>
