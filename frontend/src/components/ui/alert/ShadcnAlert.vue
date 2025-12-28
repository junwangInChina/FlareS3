<script setup>
defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'error'].includes(v)
  },
  title: String,
  closable: Boolean
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="shadcn-alert" :class="[`type-${type}`]">
    <div class="alert-icon">
      <template v-if="type === 'info'">ℹ</template>
      <template v-else-if="type === 'success'">✓</template>
      <template v-else-if="type === 'warning'">⚠</template>
      <template v-else-if="type === 'error'">✕</template>
    </div>
    <div class="alert-content">
      <div v-if="title" class="alert-title">{{ title }}</div>
      <div class="alert-body">
        <slot />
      </div>
    </div>
    <button v-if="closable" class="close-btn" @click="emit('close')">×</button>
  </div>
</template>

<style scoped>
.shadcn-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  position: relative;
}

.alert-icon {
  font-size: 18px;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  font-size: 14px;
  margin-bottom: 4px;
}

.alert-body {
  font-size: 14px;
  line-height: 1.5;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.close-btn:hover {
  opacity: 1;
}

.type-info {
  background-color: var(--nb-info);
  color: var(--nb-info-foreground);
  border-color: var(--nb-info);
}

.type-success {
  background-color: var(--nb-success);
  color: var(--nb-success-foreground);
  border-color: var(--nb-success);
}

.type-warning {
  background-color: var(--nb-warning);
  color: var(--nb-warning-foreground);
  border-color: var(--nb-warning);
}

.type-error {
  background-color: var(--nb-danger);
  color: var(--nb-danger-foreground);
  border-color: var(--nb-danger);
}
</style>
