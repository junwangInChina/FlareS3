<script setup>
import { computed } from 'vue'
import { Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
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
  options: { type: Array, default: () => [] },
  label: String,
  placeholder: String,
  disabled: Boolean,
  size: { type: String, default: 'medium' },
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n({ useScope: 'global' })

const handleValueChange = (value) => {
  // 将特殊值转换回空字符串
  emit('update:modelValue', value === '__empty__' ? '' : value)
}

// 过滤并转换选项，将空字符串替换为特殊值
const processedOptions = computed(() => {
  return props.options.map((opt) => ({
    ...opt,
    value: opt.value === '' ? '__empty__' : opt.value,
  }))
})

// 处理当前值
const currentValue = computed(() => {
  return props.modelValue === '' ? '__empty__' : String(props.modelValue)
})

const resolvedPlaceholder = computed(() => props.placeholder || t('common.pleaseSelect'))
</script>

<template>
  <div class="shadcn-select-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="select-label">{{ label }}</label>
    <SelectRoot
      :model-value="currentValue"
      :disabled="disabled"
      @update:model-value="handleValueChange"
    >
      <SelectTrigger class="shadcn-select-trigger">
        <SelectValue class="select-value" :placeholder="resolvedPlaceholder" />
        <ChevronDown class="select-icon" :size="16" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent class="shadcn-select-content" position="popper" :side-offset="4">
          <SelectScrollUpButton class="shadcn-select-scroll-btn">
            <ChevronUp class="shadcn-select-scroll-icon" :size="16" />
          </SelectScrollUpButton>

          <SelectViewport class="shadcn-select-viewport">
            <SelectGroup>
              <SelectItem
                v-for="opt in processedOptions"
                :key="opt.value"
                :value="String(opt.value)"
                :disabled="opt.disabled"
                class="shadcn-select-item"
              >
                <SelectItemText>{{ opt.label }}</SelectItemText>
                <SelectItemIndicator class="shadcn-select-item-indicator">
                  <Check :size="16" />
                </SelectItemIndicator>
              </SelectItem>
            </SelectGroup>
          </SelectViewport>

          <SelectScrollDownButton class="shadcn-select-scroll-btn">
            <ChevronDown class="shadcn-select-scroll-icon" :size="16" />
          </SelectScrollDownButton>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

<style scoped>
.shadcn-select-wrapper {
  width: 100%;
}

.select-label {
  display: block;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
  line-height: 1;
  color: var(--foreground);
  margin-bottom: 8px;
}

.shadcn-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: var(--nb-font-weight-regular);
  font-size: 0.875rem;
  border: 1px solid var(--input);
  border-radius: var(--nb-radius-md);
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  outline: none;
  transition:
    box-shadow 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.size-small .shadcn-select-trigger {
  height: 36px;
  padding: 0 12px;
}

.size-medium .shadcn-select-trigger {
  height: 40px;
  padding: 0 12px;
}

.size-large .shadcn-select-trigger {
  height: 44px;
  padding: 0 16px;
}

.shadcn-select-trigger:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

.shadcn-select-trigger[disabled],
.shadcn-select-trigger[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

.shadcn-select-trigger[data-placeholder] {
  color: var(--muted-foreground);
}

.select-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.select-icon {
  flex-shrink: 0;
  opacity: 0.5;
}
</style>

<style>
.shadcn-select-content {
  min-width: var(--radix-select-trigger-width);
  max-height: 300px;
  overflow: hidden;
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-md);
  z-index: 1100;
}

.shadcn-select-viewport {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.shadcn-select-scroll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  color: var(--muted-foreground);
  cursor: default;
}

.shadcn-select-scroll-icon {
  opacity: 0.7;
}

.shadcn-select-item {
  display: flex;
  align-items: center;
  position: relative;
  padding: 6px 32px 6px 8px;
  font-size: 0.875rem;
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: background-color 0.15s ease;
}

.shadcn-select-item:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.shadcn-select-item[data-highlighted] {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.shadcn-select-item[data-state='checked'] {
  font-weight: var(--nb-font-weight-medium);
}

.shadcn-select-item[data-disabled] {
  pointer-events: none;
  opacity: 0.5;
}

.shadcn-select-item-indicator {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0.85;
}
</style>
