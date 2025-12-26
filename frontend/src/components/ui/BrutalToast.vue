<script setup>
import { ref, reactive } from 'vue'

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
            <template v-if="toast.type === 'success'">✓</template>
            <template v-else-if="toast.type === 'error'">✕</template>
            <template v-else-if="toast.type === 'warning'">⚠</template>
            <template v-else>ℹ</template>
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
}

.brutal-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border: var(--nb-border);
  box-shadow: var(--nb-shadow);
  font-weight: 600;
  cursor: pointer;
  transition: var(--nb-transition-fast);
}

.brutal-toast:hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.toast-icon {
  font-size: 18px;
  font-weight: var(--nb-ui-font-weight-strong, 900);
}

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

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
