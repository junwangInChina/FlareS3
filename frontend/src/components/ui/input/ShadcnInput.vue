<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  rows: { type: Number, default: 3 },
  size: { type: String, default: 'medium' }
})

const emit = defineEmits(['update:modelValue', 'keyup'])

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
</script>

<template>
  <div class="shadcn-input-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="input-label" :for="inputId">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      :id="inputId"
      class="shadcn-input"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      @input="emit('update:modelValue', $event.target.value)"
      @keyup="emit('keyup', $event)"
    />
    <input
      v-else
      :id="inputId"
      :type="type"
      class="shadcn-input"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @input="emit('update:modelValue', $event.target.value)"
      @keyup="emit('keyup', $event)"
    />
  </div>
</template>

<style scoped>
.shadcn-input-wrapper {
  width: 100%;
}

.input-label {
  display: block;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 14px;
  color: var(--nb-foreground);
  margin-bottom: 6px;
}

.shadcn-input {
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: 400;
  font-size: 14px;
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-input-bg);
  color: var(--nb-foreground);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.size-small input.shadcn-input {
  padding: 0 10px;
  height: 32px;
  font-size: 13px;
}

.size-medium input.shadcn-input {
  padding: 0 12px;
  height: 36px;
  font-size: 14px;
}

.size-large input.shadcn-input {
  padding: 0 14px;
  height: 40px;
  font-size: 15px;
}

.size-small textarea.shadcn-input {
  padding: 6px 10px;
  font-size: 13px;
}

.size-medium textarea.shadcn-input {
  padding: 8px 12px;
  font-size: 14px;
}

.size-large textarea.shadcn-input {
  padding: 10px 14px;
  font-size: 15px;
}

.shadcn-input:focus {
  border-color: var(--nb-primary);
  box-shadow: 0 0 0 3px var(--nb-primary-foreground, rgba(0, 0, 0, 0.05));
}

.shadcn-input:disabled {
  background-color: var(--nb-gray-100);
  color: var(--nb-gray-400);
  border-color: var(--nb-gray-300);
  cursor: not-allowed;
  opacity: 0.6;
}

.shadcn-input::placeholder {
  color: var(--nb-muted-foreground);
}

textarea.shadcn-input {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}
</style>
