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
  <div class="brutal-input-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="input-label" :for="inputId">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      :id="inputId"
      class="brutal-input"
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
      class="brutal-input"
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
.brutal-input-wrapper {
  width: 100%;
}

.input-label {
  display: block;
  font-family: var(--nb-font-sans);
  font-weight: 600;
  font-size: 13px;
  text-transform: none;
  color: var(--nb-gray-600);
  margin-bottom: var(--nb-space-xs);
}

.brutal-input {
  width: 100%;
  font-family: var(--nb-font-sans);
  font-size: 16px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-white);
  color: var(--nb-black);
  outline: none;
  transition: var(--nb-transition);
}

.size-small .brutal-input {
  padding: 8px 12px;
  font-size: 14px;
}

.size-medium .brutal-input {
  padding: 12px 16px;
  font-size: 16px;
}

.size-large .brutal-input {
  padding: 16px 20px;
  font-size: 18px;
}

.brutal-input:focus {
  border-color: var(--nb-black);
  box-shadow: var(--nb-focus-ring);
  background-color: var(--nb-white);
}

.brutal-input:disabled {
  background-color: var(--nb-gray-100);
  color: var(--nb-gray-500);
  border-color: var(--nb-gray-200);
  cursor: not-allowed;
}

.brutal-input::placeholder {
  color: var(--nb-gray-400);
}

textarea.brutal-input {
  resize: vertical;
  min-height: 100px;
}
</style>
