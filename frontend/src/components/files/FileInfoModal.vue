<template>
  <Modal
    :show="show"
    :title="t('files.modals.infoTitle')"
    width="600px"
    @update:show="handleUpdateShow"
  >
    <template v-if="file">
      <div class="file-info">
        <div
          v-for="row in fileInfoRows"
          :key="row.key"
          class="file-info-row"
          :style="{ '--columns': row.columns }"
        >
          <div v-for="item in row.items" :key="item.key" class="file-info-item">
            <span class="file-info-label">{{ item.label }}:</span>
            <span class="file-info-value">
              <template v-if="item.key === 'fileInfo'">
                <span class="file-info-filename">{{ item.value.filename }}</span>
                <span v-if="item.value.sizeText" class="file-info-filesize"> ({{ item.value.sizeText }})</span>
              </template>
              <template v-else>{{ item.value }}</template>
            </span>
          </div>
        </div>
      </div>

      <Divider />

      <div class="link-group">
        <label class="link-label">{{ t('upload.shortLink') }}</label>
        <div class="link-row">
          <Input :model-value="shortUrl" readonly size="small" />
          <Button type="primary" size="small" :disabled="!shortUrl" @click="copyUrl(shortUrl)">
            {{ t('upload.copy') }}
          </Button>
        </div>
      </div>

      <div class="link-group">
        <label class="link-label">{{ t('upload.directLink') }}</label>
        <div class="link-row">
          <Input :model-value="downloadUrl" readonly size="small" />
          <Button type="default" size="small" :disabled="!downloadUrl" @click="copyUrl(downloadUrl)">
            {{ t('upload.copy') }}
          </Button>
        </div>
      </div>
    </template>

    <template #footer>
      <Button type="default" @click="handleUpdateShow(false)">{{ t('common.close') }}</Button>
      <Button type="primary" :disabled="!downloadUrl" @click="downloadFile">
        {{ t('files.downloadFile') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/modal/Modal.vue'
import Divider from '../ui/divider/Divider.vue'
import Input from '../ui/input/Input.vue'
import Button from '../ui/button/Button.vue'
import { useMessage } from '../../composables/useMessage'

const props = defineProps({
  show: Boolean,
  file: Object,
})

const emit = defineEmits(['update:show'])

const { t, locale } = useI18n({ useScope: 'global' })
const message = useMessage()

const formatDateTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale.value)
}

const formatMegabytes = (bytes) => {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size < 0) return '-'
  const mb = size / (1024 * 1024)
  return `${mb.toFixed(2)}MB`
}

const formatFileInfo = (file) => {
  const filename = String(file?.filename ?? '').trim()
  if (!filename) return { filename: '-', sizeText: '' }
  const size = formatMegabytes(file?.size)
  if (size === '-') return { filename, sizeText: '' }
  return { filename, sizeText: size }
}

const fileInfoRows = computed(() => {
  const file = props.file
  if (!file) return []

  const permission = file.require_login ? t('files.permission.requireLogin') : t('files.permission.public')
  return [
    {
      key: 'primary',
      columns: 2,
      items: [
        { key: 'fileInfo', label: t('files.info.fileInfo'), value: formatFileInfo(file) },
        { key: 'permission', label: t('files.info.permission'), value: permission },
      ],
    },
    {
      key: 'secondary',
      columns: 2,
      items: [
        { key: 'uploadedAt', label: t('files.info.uploadedAt'), value: formatDateTime(file.created_at) },
        { key: 'remaining', label: t('files.info.remaining'), value: file.remaining_time || '-' },
      ],
    },
  ]
})

const shortUrl = computed(() => {
  const file = props.file
  const code = String(file?.short_code || '').trim()
  if (!code) return ''
  if (typeof window === 'undefined') return `/s/${code}`
  return `${window.location.origin}/s/${code}`
})

const downloadUrl = computed(() => {
  const file = props.file
  if (!file) return ''
  const direct = String(file?.download_url || '').trim()
  if (direct) return direct
  const id = String(file?.id || '').trim()
  if (!id) return ''
  if (typeof window === 'undefined') return `/api/files/${id}/download`
  return `${window.location.origin}/api/files/${id}/download`
})

const copyUrl = (url) => {
  navigator.clipboard.writeText(url)
  message.success(t('common.copied'))
}

const downloadFile = () => {
  if (!downloadUrl.value) return
  window.open(downloadUrl.value, '_blank')
}

const handleUpdateShow = (value) => {
  emit('update:show', value)
}
</script>

<style scoped>
.file-info {
  display: grid;
  gap: 16px;
}

.file-info-row {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.file-info-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.file-info-label {
  font-size: 0.875rem;
  font-weight: var(--nb-font-weight-medium);
  color: var(--muted-foreground, var(--nb-gray-500));
  flex-shrink: 0;
  white-space: nowrap;
}

.file-info-value {
  font-size: 0.875rem;
  color: var(--foreground, var(--nb-ink));
  overflow-wrap: anywhere;
  flex: 1;
  min-width: 0;
}

.file-info-filename {
  color: var(--foreground, var(--nb-ink));
  font-weight: var(--nb-font-weight-medium);
}

.file-info-filesize {
  color: var(--muted-foreground, var(--nb-gray-500));
  font-family: var(--nb-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  white-space: nowrap;
}

.link-group {
  margin-bottom: var(--nb-space-md);
}

.link-label {
  display: block;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-size: 12px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  color: var(--nb-gray-500);
  margin-bottom: 4px;
}

.link-row {
  display: flex;
  gap: var(--nb-space-sm);
}

@media (max-width: 720px) {
  .file-info-row {
    grid-template-columns: 1fr;
  }

  .link-row {
    flex-direction: column;
  }
}
</style>
