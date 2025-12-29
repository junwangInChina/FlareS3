<script setup>
import { computed } from 'vue'
import { Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] }, // [{ label, value, disabled? }]
  label: String,
  placeholder: String,
  disabled: Boolean,
  size: { type: String, default: 'medium' },
})

const emit = defineEmits(['update:modelValue'])

const handleValueChange = (value) => {
  emit('update:modelValue', value === '__empty__' ? '' : value)
}

const processedOptions = computed(() => {
  return props.options.map((opt) => ({
    ...opt,
    value: opt.value === '' ? '__empty__' : opt.value,
  }))
})

const currentValue = computed(() => {
  return props.modelValue === '' ? '__empty__' : String(props.modelValue)
})
</script>

<template>
  <div class="brutal-select-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="select-label">{{ label }}</label>
    <SelectRoot
      :model-value="currentValue"
      :disabled="disabled"
      @update:model-value="handleValueChange"
    >
      <SelectTrigger class="brutal-select-trigger">
        <SelectValue :placeholder="placeholder || '请选择'" />
        <ChevronDown class="select-icon" :size="16" />
      </SelectTrigger>

      <SelectPortal>
        <SelectContent class="brutal-select-content" position="popper" :side-offset="4">
          <SelectScrollUpButton class="brutal-select-scroll-btn">
            <ChevronUp class="brutal-select-scroll-icon" :size="16" />
          </SelectScrollUpButton>

          <SelectViewport class="brutal-select-viewport">
            <SelectGroup>
              <SelectItem
                v-for="opt in processedOptions"
                :key="opt.value"
                :value="String(opt.value)"
                :disabled="opt.disabled"
                class="brutal-select-item"
              >
                <SelectItemText>{{ opt.label }}</SelectItemText>
                <SelectItemIndicator class="brutal-select-item-indicator">
                  <Check :size="16" />
                </SelectItemIndicator>
              </SelectItem>
            </SelectGroup>
          </SelectViewport>

          <SelectScrollDownButton class="brutal-select-scroll-btn">
            <ChevronDown class="brutal-select-scroll-icon" :size="16" />
          </SelectScrollDownButton>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

<style scoped>
.brutal-select-wrapper {
  width: 100%;
}

.select-label {
  display: block;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  margin-bottom: var(--nb-space-xs);
}

.brutal-select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: 300;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-input-bg);
  color: var(--nb-black);
  cursor: pointer;
  outline: none;
  transition: var(--nb-transition-fast);
}

.size-small .brutal-select-trigger {
  padding: 0 32px 0 12px;
  height: 36px;
  font-size: 14px;
  line-height: 34px;
}

.size-medium .brutal-select-trigger {
  padding: 0 40px 0 16px;
  height: 44px;
  font-size: 16px;
  line-height: 42px;
}

.size-large .brutal-select-trigger {
  padding: 0 48px 0 20px;
  height: 52px;
  font-size: 18px;
  line-height: 50px;
}

.brutal-select-trigger:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

.brutal-select-trigger[disabled],
.brutal-select-trigger[data-disabled] {
  background-color: var(--nb-gray-200);
  color: var(--nb-gray-400);
  border-color: var(--nb-gray-400);
  cursor: not-allowed;
}

.brutal-select-trigger[data-placeholder] {
  color: var(--nb-gray-400);
}

.select-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.85;
}
</style>

<style>
:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-content {
  min-width: var(--radix-select-trigger-width);
  max-height: 320px;
  overflow: hidden;
  background: var(--nb-surface);
  color: var(--nb-black);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow);
  z-index: 1100;
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-viewport {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-scroll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  color: var(--nb-black);
  cursor: default;
  background: var(--nb-bg);
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-scroll-icon {
  opacity: 0.8;
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-item {
  display: flex;
  align-items: center;
  position: relative;
  padding: 8px 12px 8px 36px;
  font-size: 14px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-surface);
  color: var(--nb-black);
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: var(--nb-transition-fast);
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-item:hover,
:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-item[data-highlighted] {
  background: var(--nb-primary);
  color: var(--nb-ink);
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-item[data-disabled] {
  pointer-events: none;
  opacity: 0.5;
}

:root[data-ui-theme="motherduck-neobrutalism"] .brutal-select-item-indicator {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}
</style>
