<script setup>
defineProps({
  modelValue: Boolean,
  label: String,
  checkedText: String,
  uncheckedText: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])

const toggle = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label class="brutal-switch" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.checked)"
    />
    <span class="switch-track" :class="{ checked: modelValue }">
      <span class="switch-thumb"></span>
    </span>
    <span v-if="label || checkedText || uncheckedText" class="switch-label">
      {{ label || (modelValue ? checkedText : uncheckedText) }}
    </span>
  </label>
</template>

<style scoped>
.brutal-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  gap: var(--nb-space-sm);
}

.brutal-switch input {
  display: none;
}

.switch-track {
  width: 52px;
  height: 28px;
  background: var(--nb-gray-300);
  border: var(--nb-border);
  position: relative;
  transition: var(--nb-transition-fast);
  box-shadow: var(--nb-shadow-sm);
  border-radius: var(--nb-radius);
}

.switch-track.checked {
  background: var(--nb-success);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--nb-white);
  border: var(--nb-border);
  transition: var(--nb-transition-fast);
  border-radius: var(--nb-radius);
}

.switch-track.checked .switch-thumb {
  left: 26px;
  background: var(--nb-ink);
}

.switch-label {
  font-family: var(--nb-font-mono);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
