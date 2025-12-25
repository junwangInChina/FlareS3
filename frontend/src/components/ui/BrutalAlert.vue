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
  <div class="brutal-alert" :class="[`type-${type}`]">
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
.brutal-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--nb-space-md);
  padding: var(--nb-space-md);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow-sm);
  border-radius: var(--nb-radius);
  position: relative;
}

.alert-icon {
  font-size: 20px;
  font-weight: 900;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-family: var(--nb-font-mono);
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: var(--nb-space-xs);
}

.alert-body {
  font-size: 14px;
  line-height: 1.5;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

/* Types */
.type-info {
  background-color: var(--nb-info);
  color: var(--nb-ink);
  border-color: var(--nb-ink);
}

.type-success {
  background-color: var(--nb-success);
  color: var(--nb-ink);
  border-color: var(--nb-ink);
}

.type-warning {
  background-color: var(--nb-warning);
  color: var(--nb-ink);
  border-color: var(--nb-ink);
}

.type-error {
  background-color: var(--nb-danger);
  color: var(--nb-white);
  border-color: var(--nb-ink);
}
</style>
