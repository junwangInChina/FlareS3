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
          class="shadcn-toast"
          :class="[`type-${toast.type}`]"
          @click="remove(toast.id)"
        >
          <span class="toast-icon">
            <component :is="getIcon(toast.type)" :size="18" />
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
  max-width: 400px;
  pointer-events: none;
}

.shadcn-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--nb-radius-lg);
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow: var(--nb-shadow-lg);
  cursor: pointer;
  pointer-events: auto;
  min-width: 300px;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 2px;
  color: var(--muted-foreground);
}

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
}

.type-success .toast-icon {
  color: var(--nb-success);
}

.type-error {
  border-color: var(--destructive);
}

.type-error .toast-icon {
  color: var(--destructive);
}

.type-warning .toast-icon {
  color: var(--nb-warning);
}

.type-info .toast-icon {
  color: var(--nb-info);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
