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
  box-shadow: 2px 2px 0 var(--nb-black);
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
  border: 2px solid var(--nb-black);
  transition: var(--nb-transition-fast);
}

.switch-track.checked .switch-thumb {
  left: 26px;
  background: var(--nb-black);
}

.switch-label {
  font-weight: 600;
  font-size: 14px;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
