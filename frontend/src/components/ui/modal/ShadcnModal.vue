<script setup>
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue'

const props = defineProps({
  show: Boolean,
  title: String,
  width: { type: String, default: '500px' }
})

const emit = defineEmits(['update:show', 'close'])

const handleOpenChange = (open) => {
  if (!open) {
    emit('update:show', false)
    emit('close')
  }
}
</script>

<template>
  <DialogRoot :open="show" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="modal-overlay" />
      <DialogContent class="modal-content" :style="{ maxWidth: width }">
        <div class="modal-header">
          <DialogTitle class="modal-title">{{ title }}</DialogTitle>
          <DialogClose class="close-btn">×</DialogClose>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--nb-surface);
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  box-shadow: var(--nb-shadow-lg);
  width: 90vw;
  max-height: 85vh;
  overflow: auto;
  z-index: 1001;
  animation: slideIn 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: var(--nb-border);
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-foreground);
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: var(--nb-muted-foreground);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nb-radius-sm);
  transition: all 0.15s ease;
}

.close-btn:hover {
  background-color: var(--nb-gray-100);
  color: var(--nb-foreground);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: var(--nb-border);
  background-color: var(--nb-gray-50);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
</style>
