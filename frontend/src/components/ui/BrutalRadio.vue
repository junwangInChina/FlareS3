<script setup>
defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] }, // [{ label, value }]
  name: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="brutal-radio-group">
    <label
      v-for="opt in options"
      :key="opt.value"
      class="radio-label"
      :class="{ disabled }"
    >
      <input
        type="radio"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled"
        @change="emit('update:modelValue', opt.value)"
      />
      <span class="radio-custom"></span>
      <span class="radio-text">{{ opt.label }}</span>
    </label>
  </div>
</template>

<style scoped>
.brutal-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nb-space-md);
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-family: var(--nb-font-mono);
  font-weight: 700;
  text-transform: uppercase;
}

.radio-label input {
  display: none;
}

.radio-custom {
  width: 24px;
  height: 24px;
  border: var(--nb-border);
  border-radius: 50%;
  margin-right: 8px;
  position: relative;
  background: var(--nb-surface);
  box-shadow: var(--nb-shadow-sm);
  transition: var(--nb-transition-fast);
}

.radio-label input:checked ~ .radio-custom::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  background: var(--nb-black);
  border-radius: 50%;
}

.radio-label:hover .radio-custom {
  background: var(--nb-gray-100);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
