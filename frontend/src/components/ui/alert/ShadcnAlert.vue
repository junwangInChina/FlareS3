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
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--nb-radius-lg);
  background: var(--background);
  color: var(--foreground);
  position: relative;
}

.alert-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  font-size: 0.875rem;
  line-height: 1.25;
  margin-bottom: 4px;
}

.alert-body {
  font-size: 0.875rem;
  line-height: 1.5;
}

.close-btn {
  position: absolute;
  right: 12px;
  top: 12px;
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nb-radius-sm);
  color: var(--muted-foreground);
  opacity: 0.7;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.close-btn:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
  opacity: 1;
}

.close-btn:focus-visible {
  box-shadow: var(--nb-focus-ring);
  opacity: 1;
}

.type-error {
  border-color: var(--destructive);
}

.type-error .alert-icon,
.type-error .alert-title {
  color: var(--destructive);
}
</style>
