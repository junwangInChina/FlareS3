<script setup>
import { computed } from 'vue'
import { SelectContent, SelectGroup, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue } from 'radix-vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, default: () => [] },
  label: String,
  placeholder: String,
  disabled: Boolean,
  size: { type: String, default: 'medium' }
})

const emit = defineEmits(['update:modelValue'])

const handleValueChange = (value) => {
  // 将特殊值转换回空字符串
  emit('update:modelValue', value === '__empty__' ? '' : value)
}

// 过滤并转换选项，将空字符串替换为特殊值
const processedOptions = computed(() => {
  return props.options.map(opt => ({
    ...opt,
    value: opt.value === '' ? '__empty__' : opt.value
  }))
})

// 处理当前值
const currentValue = computed(() => {
  return props.modelValue === '' ? '__empty__' : String(props.modelValue)
})
</script>

<template>
  <div class="shadcn-select-wrapper" :class="[`size-${size}`]">
    <label v-if="label" class="select-label">{{ label }}</label>
    <SelectRoot :model-value="currentValue" :disabled="disabled" @update:model-value="handleValueChange">
      <SelectTrigger class="shadcn-select-trigger">
        <SelectValue :placeholder="placeholder || '请选择'" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent class="shadcn-select-content" position="popper" :side-offset="4">
          <SelectGroup>
            <SelectItem
              v-for="opt in processedOptions"
              :key="opt.value"
              :value="String(opt.value)"
              class="shadcn-select-item"
            >
              <SelectItemText>{{ opt.label }}</SelectItemText>
            </SelectItem>
          </SelectGroup>
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
  font-size: 14px;
  color: var(--nb-foreground);
  margin-bottom: 6px;
}

.shadcn-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: 400;
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-input-bg);
  color: var(--nb-foreground);
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.size-small .shadcn-select-trigger {
  padding: 0 10px;
  height: 32px;
  font-size: 13px;
}

.size-medium .shadcn-select-trigger {
  padding: 0 12px;
  height: 36px;
  font-size: 14px;
}

.size-large .shadcn-select-trigger {
  padding: 0 14px;
  height: 40px;
  font-size: 15px;
}

.shadcn-select-trigger:hover:not([disabled]) {
  border-color: var(--nb-gray-400);
}

.shadcn-select-trigger:focus {
  border-color: var(--nb-primary);
  box-shadow: 0 0 0 3px var(--nb-primary-foreground, rgba(0, 0, 0, 0.05));
}

.shadcn-select-trigger[disabled] {
  background-color: var(--nb-gray-100);
  color: var(--nb-gray-400);
  border-color: var(--nb-gray-300);
  cursor: not-allowed;
  opacity: 0.6;
}

.shadcn-select-content {
  min-width: var(--radix-select-trigger-width);
  max-height: 300px;
  overflow-y: auto;
  background: var(--nb-surface);
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  box-shadow: var(--nb-shadow-md);
  padding: 4px;
  z-index: 50;
}

.shadcn-select-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: background-color 0.15s ease;
}

.shadcn-select-item:hover {
  background-color: var(--nb-gray-100);
}

.shadcn-select-item[data-highlighted] {
  background-color: var(--nb-gray-100);
}

.shadcn-select-item[data-state="checked"] {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground);
}
</style>
