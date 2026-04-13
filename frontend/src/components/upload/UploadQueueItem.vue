<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../ui/card/Card.vue'
import Button from '../ui/button/Button.vue'
import Progress from '../ui/progress/Progress.vue'
import Tag from '../ui/tag/Tag.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const emit = defineEmits(['cancel', 'retry', 'remove'])
const { t } = useI18n({ useScope: 'global' })

const statusLabel = computed(() => {
  const key = `upload.queue.status.${props.item.status || 'queued'}`
  return t(key)
})

const statusTagType = computed(() => {
  if (props.item.status === 'success') return 'success'
  if (props.item.status === 'error') return 'danger'
  if (props.item.status === 'cancelled') return 'warning'
  if (props.item.status === 'uploading') return 'info'
  return 'default'
})

const progressValue = computed(() => Math.max(0, Math.min(100, Number(props.item.progress || 0))))

const bytesText = computed(() => {
  const uploadedBytes = Number(props.item.uploadedBytes || 0)
  const totalBytes = Number(props.item.totalBytes || 0)
  if (!totalBytes) {
    return ''
  }
  return `${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`
})

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const unit = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(unit)), sizes.length - 1)
  return `${(value / Math.pow(unit, index)).toFixed(2)} ${sizes[index]}`
}
</script>

<template>
  <Card class="upload-queue-item">
    <div class="upload-queue-item-header">
      <div class="upload-queue-item-main">
        <strong class="upload-queue-item-name">{{ item.file?.name }}</strong>
        <p v-if="item.error" class="upload-queue-item-error">{{ item.error }}</p>
      </div>
      <Tag :type="statusTagType" size="small">{{ statusLabel }}</Tag>
    </div>

    <Progress :percentage="progressValue" :height="10" :show-indicator="false" />

    <div class="upload-queue-item-meta">
      <span v-if="bytesText">{{ bytesText }}</span>
      <span v-if="item.speed">{{ item.speed }}</span>
      <span v-if="item.status === 'uploading' && item.remainingTime">
        {{ t('upload.remaining', { time: item.remainingTime }) }}
      </span>
    </div>

    <div class="upload-queue-item-actions">
      <Button
        v-if="item.status === 'uploading'"
        size="small"
        type="default"
        @click="emit('cancel', item.id)"
      >
        {{ t('upload.queue.actions.cancel') }}
      </Button>

      <template v-else-if="item.status === 'error' || item.status === 'cancelled'">
        <Button size="small" type="default" @click="emit('retry', item.id)">
          {{ t('upload.queue.actions.retry') }}
        </Button>
        <Button size="small" type="default" @click="emit('remove', item.id)">
          {{ t('upload.queue.actions.remove') }}
        </Button>
      </template>

      <Button
        v-else-if="item.status === 'success'"
        size="small"
        type="default"
        @click="emit('remove', item.id)"
      >
        {{ t('upload.queue.actions.remove') }}
      </Button>
    </div>
  </Card>
</template>

<style scoped>
.upload-queue-item {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.upload-queue-item-header {
  display: flex;
  justify-content: space-between;
  gap: var(--nb-space-sm);
  align-items: flex-start;
}

.upload-queue-item-main {
  min-width: 0;
  flex: 1;
}

.upload-queue-item-name {
  display: block;
  word-break: break-all;
}

.upload-queue-item-error {
  margin: 6px 0 0;
  color: var(--nb-danger);
  font-size: 13px;
  word-break: break-word;
}

.upload-queue-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nb-space-sm);
  font-size: 12px;
  color: var(--nb-gray-500);
}

.upload-queue-item-actions {
  display: flex;
  gap: var(--nb-space-sm);
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
