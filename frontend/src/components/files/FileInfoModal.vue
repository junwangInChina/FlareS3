<template>
  <Modal
    :show="show"
    :title="t('files.modals.infoTitle')"
    width="500px"
    @update:show="handleUpdateShow"
  >
    <template v-if="file">
      <Descriptions :items="fileInfoItems" :column="1" />

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
import Descriptions from '../ui/descriptions/Descriptions.vue'
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

const formatBytes = (bytes) => {
  const size = Number(bytes || 0)
  if (!Number.isFinite(size) || size < 0) return '-'
  if (size === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(size) / Math.log(k))
  return Math.round((size / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const fileInfoItems = computed(() => {
  const file = props.file
  if (!file) return []

  const permission = file.require_login ? t('files.permission.requireLogin') : t('files.permission.public')
  return [
    { label: t('files.info.filename'), value: file.filename || '-' },
    { label: t('files.info.size'), value: formatBytes(file.size) },
    { label: t('files.info.uploadedAt'), value: formatDateTime(file.created_at) },
    { label: t('files.info.remaining'), value: file.remaining_time || '-' },
    { label: t('files.info.permission'), value: permission },
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
  .link-row {
    flex-direction: column;
  }
}
</style>

