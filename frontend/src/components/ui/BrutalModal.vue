<script setup>
defineProps({
  show: Boolean,
  title: String,
  width: { type: String, default: '500px' }
})

const emit = defineEmits(['update:show', 'close'])

const close = () => {
  emit('update:show', false)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-content" :style="{ maxWidth: width }">
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="close-btn" @click="close">×</button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--nb-space-md);
}

.modal-content {
  background: var(--nb-surface);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow-lg);
  border-radius: var(--nb-radius);
  width: 100%;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-md);
  background: var(--nb-secondary);
  border-bottom: var(--nb-border);
  color: var(--nb-ink);
  border-bottom-color: var(--nb-ink);
}

.modal-title {
  margin: 0;
  font-size: var(--nb-font-size-lg);
  font-family: var(--nb-font-mono);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: var(--nb-danger);
  color: var(--nb-white);
  border: var(--nb-border);
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--nb-transition-fast);
  box-shadow: none;
}

.close-btn:hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.close-btn:active {
  transform: translate(0, 0);
  box-shadow: none;
}

.modal-body {
  padding: var(--nb-space-lg);
}

.modal-footer {
  padding: var(--nb-space-md);
  border-top: var(--nb-border);
  background: var(--nb-gray-100);
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(-20px);
}
</style>
