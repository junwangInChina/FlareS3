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
  background: var(--nb-modal-overlay-bg);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: var(--nb-radius-lg);
  box-shadow: var(--nb-shadow-lg);
  width: 90vw;
  max-height: 85vh;
  overflow: auto;
  z-index: 1001;
  padding: 24px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--nb-font-weight-semibold);
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.close-btn {
  position: absolute;
  right: 16px;
  top: 16px;
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nb-radius-sm);
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  opacity: 0.7;
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

.modal-body {
  padding-top: 16px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
