<script setup>
import { useI18n } from 'vue-i18n'
import UploadQueueItem from './UploadQueueItem.vue'

defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['cancel', 'retry', 'remove'])
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="upload-queue">
    <header class="upload-queue-header">
      <h3 class="upload-queue-title">{{ t('upload.queue.title') }}</h3>
      <span class="upload-queue-count">{{ items.length }}</span>
    </header>

    <div class="upload-queue-items">
      <UploadQueueItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        @cancel="emit('cancel', $event)"
        @retry="emit('retry', $event)"
        @remove="emit('remove', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.upload-queue {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-md);
}

.upload-queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
}

.upload-queue-title {
  margin: 0;
  font-size: 16px;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
}

.upload-queue-count {
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--nb-border);
  border-radius: 999px;
  font-size: 12px;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  background: var(--nb-surface);
}

.upload-queue-items {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}
</style>
