<script setup>
import { ref } from 'vue'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-vue-next'

const toasts = ref([])
let idCounter = 0

const add = (message, type = 'info', duration = 3000) => {
  const id = idCounter++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
  return id
}

const remove = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const success = (message, duration) => add(message, 'success', duration)
const error = (message, duration) => add(message, 'error', duration)
const warning = (message, duration) => add(message, 'warning', duration)
const info = (message, duration) => add(message, 'info', duration)

const getIcon = (type) => {
  switch (type) {
    case 'success': return CheckCircle
    case 'error': return XCircle
    case 'warning': return AlertTriangle
    default: return Info
  }
}

defineExpose({ add, remove, success, error, warning, info })
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="brutal-toast"
          :class="[`type-${toast.type}`]"
          @click="remove(toast.id)"
        >
          <span class="toast-icon">
            <component :is="getIcon(toast.type)" :size="18" stroke-width="2.5" />
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 600px;
  pointer-events: none;
}

.brutal-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  border: var(--nb-border);
  box-shadow: var(--nb-shadow);
  font-weight: 600;
  cursor: pointer;
  transition: var(--nb-transition-fast);
  pointer-events: auto;
}

.brutal-toast:hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.toast-message {
  min-width: 0;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Default Brutal Theme Colors */
.type-success {
  background: var(--nb-success);
  color: var(--nb-success-foreground, var(--nb-ink));
}

.type-error {
  background: var(--nb-danger);
  color: var(--nb-danger-foreground, var(--nb-white));
}

.type-warning {
  background: var(--nb-warning);
  color: var(--nb-warning-foreground, var(--nb-ink));
}

.type-info {
  background: var(--nb-info);
  color: var(--nb-info-foreground, var(--nb-ink));
}

/* shadcn/ui theme overrides */
:root[data-ui-theme="shadcn"] .toast-container {
  top: 24px;
  bottom: auto;
  left: auto;
  right: 24px;
  transform: none;
  gap: 16px;
  max-width: 600px;
}

:root[data-ui-theme="shadcn"] .brutal-toast {
  padding: 16px 24px;
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-md);
  font-weight: 500;
  background: var(--nb-surface);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border-color);
  font-family: var(--nb-font-sans);
}

:root[data-ui-theme="shadcn"] .brutal-toast:hover {
  transform: none;
  box-shadow: var(--nb-shadow-lg);
  border-color: var(--nb-gray-300);
}

:root[data-ui-theme="shadcn"] .toast-icon {
  margin-right: 4px;
}

/* In shadcn theme, we keep the background neutral and color the icon/text or border */
:root[data-ui-theme="shadcn"] .brutal-toast.type-success {
  background: var(--nb-surface);
  color: var(--nb-ink);
}
:root[data-ui-theme="shadcn"] .brutal-toast.type-success .toast-icon {
  color: var(--nb-success);
}

:root[data-ui-theme="shadcn"] .brutal-toast.type-error {
  background: var(--nb-surface);
  color: var(--nb-ink);
}
:root[data-ui-theme="shadcn"] .brutal-toast.type-error .toast-icon {
  color: var(--nb-danger);
}

:root[data-ui-theme="shadcn"] .brutal-toast.type-warning {
  background: var(--nb-surface);
  color: var(--nb-ink);
}
:root[data-ui-theme="shadcn"] .brutal-toast.type-warning .toast-icon {
  color: var(--nb-warning);
}

:root[data-ui-theme="shadcn"] .brutal-toast.type-info {
  background: var(--nb-surface);
  color: var(--nb-ink);
}
:root[data-ui-theme="shadcn"] .brutal-toast.type-info .toast-icon {
  color: var(--nb-info);
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

:root[data-ui-theme="shadcn"] .toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
  height: 0;
  padding: 0;
  margin: 0;
}

:root[data-ui-theme="shadcn"] .toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
  height: 0;
  padding: 0;
  margin: 0;
}
</style>