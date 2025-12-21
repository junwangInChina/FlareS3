<script setup>
defineProps({
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
</script>

<template>
  <div class="brutal-input-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="input-label">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
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
  font-family: var(--nb-font-mono);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  margin-bottom: var(--nb-space-xs);
}

.brutal-input {
  width: 100%;
  font-family: var(--nb-font-sans);
  font-size: 16px;
  border: var(--nb-border);
  background: var(--nb-white);
  outline: none;
  transition: var(--nb-transition-fast);
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
  box-shadow: var(--nb-shadow);
  background-color: #fffde7;
}

.brutal-input:disabled {
  background-color: var(--nb-gray-200);
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
