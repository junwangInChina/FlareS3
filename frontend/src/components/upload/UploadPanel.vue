<template>
  <div class="upload-panel">
    <Upload ref="uploadRef" @file-selected="handleUpload" @before-upload="beforeUpload">
      <p class="upload-hint">{{ t('upload.hint5gb') }}</p>
    </Upload>

    <Divider />

    <div class="upload-options">
      <FormItem :label="t('upload.expiresIn')">
        <Radio v-model="expiresIn" :options="expiresOptions" name="expires" />
      </FormItem>

      <FormItem :label="t('upload.r2Config')">
        <Select
          v-model="selectedR2ConfigId"
          :options="r2ConfigOptions"
          :disabled="isUploading || r2OptionsLoading"
        />
      </FormItem>

      <FormItem :label="t('upload.downloadPermission')">
        <Switch
          v-model="requireLogin"
          :checked-text="t('upload.requireLogin')"
          :unchecked-text="t('upload.publicDownload')"
        />
      </FormItem>
    </div>

    <Alert v-if="isUploading" type="info" class="upload-status">
      <template #default>
        <div class="upload-info">
          <strong>{{ t('upload.uploading', { filename: currentFile?.name || '' }) }}</strong>
          <Progress :percentage="displayProgress" :height="20" />
          <div class="upload-stats">
            <span>{{ formatBytes(uploadedSize) }} / {{ formatBytes(totalSize) }}</span>
            <span>{{ uploadSpeed }}</span>
            <span>{{ t('upload.remaining', { time: remainingTime }) }}</span>
          </div>
          <div class="upload-actions">
            <Button size="small" type="default" @click="cancelUpload">
              {{ t('common.cancel') }}
            </Button>
          </div>
        </div>
      </template>
    </Alert>

    <div v-if="uploadResult" class="upload-result">
      <Alert :type="uploadResult.success ? 'success' : 'error'">
        <template #default>
          <div v-if="uploadResult.success">
            <div class="file-info">
              <strong>📄 {{ uploadResult.filename }}</strong>
            </div>
            <div class="upload-summary">
              <Tag type="info">{{ uploadResult.fileSize }}</Tag>
              <Tag type="success">{{ uploadResult.avgSpeed }}</Tag>
              <Tag type="warning">{{ uploadResult.duration }}</Tag>
            </div>
            <p class="expire-note">
              {{ fileExpireText }}
            </p>

            <div class="link-group">
              <label class="link-label">{{ t('upload.shortLink') }}</label>
              <div class="link-row">
                <Input :model-value="uploadResult.shortUrl" readonly size="small" />
                <Button type="primary" size="small" @click="copyShortUrl">{{
                  t('upload.copy')
                }}</Button>
              </div>
            </div>

            <div class="link-group">
              <label class="link-label">{{ t('upload.directLink') }}</label>
              <div class="link-row">
                <Input :model-value="uploadResult.downloadUrl" readonly size="small" />
                <Button type="default" size="small" @click="copyDownloadUrl">{{
                  t('upload.copy')
                }}</Button>
              </div>
            </div>
          </div>
          <div v-else>
            {{ uploadResult.message }}
          </div>
        </template>
      </Alert>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import Upload from '../ui/upload/Upload.vue'
import Divider from '../ui/divider/Divider.vue'
import FormItem from '../ui/form-item/FormItem.vue'
import Radio from '../ui/radio/Radio.vue'
import Switch from '../ui/switch/Switch.vue'
import Select from '../ui/select/Select.vue'
import Alert from '../ui/alert/Alert.vue'
import Progress from '../ui/progress/Progress.vue'
import Tag from '../ui/tag/Tag.vue'
import Input from '../ui/input/Input.vue'
import Button from '../ui/button/Button.vue'
import { useMessage } from '../../composables/useMessage'

const emit = defineEmits(['uploaded'])

const message = useMessage()
const { t } = useI18n({ useScope: 'global' })

const uploadRef = ref(null)
const expiresIn = ref(7)
const requireLogin = ref(true)

const selectedR2ConfigId = ref('')
const r2ConfigOptions = ref([])
const r2OptionsLoading = ref(false)

const expiresOptions = computed(() =>
  [1, 3, 7, 30, 0].map((value) => ({
    label: value === 0 ? t('upload.expireNever') : t('upload.expireDays', { days: value }),
    value,
  }))
)

const fileExpireText = computed(() =>
  expiresIn.value === 0
    ? t('upload.fileNeverExpire')
    : t('upload.fileExpire', { days: expiresIn.value })
)

onMounted(async () => {
  try {
    r2OptionsLoading.value = true
    const result = await api.getR2Options()
    const opts = result.options || []
    r2ConfigOptions.value = opts.map((opt) => ({
      label: opt.name,
      value: opt.id,
    }))
    selectedR2ConfigId.value = result.default_config_id || opts[0]?.id || ''
  } catch (error) {
    console.error('加载 R2 配置选项失败:', error)
    message.error(t('upload.loadR2OptionsFailed'))
  } finally {
    r2OptionsLoading.value = false
  }
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  cancelUpload({ silent: true })
  isUploading.value = false
})

const uploadProgress = ref(0)
const currentFile = ref(null)
const uploadResult = ref(null)
const isUploading = ref(false)
const uploadedSize = ref(0)
const totalSize = ref(0)
const uploadSpeed = ref(t('upload.preparing'))
const remainingTime = ref(t('upload.calculating'))
const displayProgress = ref(0)
let uploadStartTime = 0
let animationFrame = null
const cancelRequested = ref(false)
const activeMultipart = ref(null)
const inFlightControllers = new Set()

const UPLOAD_CANCELLED = 'UPLOAD_CANCELLED'

const createCancelledError = () => new Error(UPLOAD_CANCELLED)

const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'CanceledError' ||
  error?.message === UPLOAD_CANCELLED

const registerController = () => {
  const controller = new AbortController()
  inFlightControllers.add(controller)
  return controller
}

const abortInFlightRequests = () => {
  for (const controller of inFlightControllers) {
    try {
      controller.abort()
    } catch {
      // ignore
    }
  }
  inFlightControllers.clear()
}

const cancelUpload = async ({ silent = false } = {}) => {
  if (cancelRequested.value) return
  cancelRequested.value = true
  abortInFlightRequests()

  const multipart = activeMultipart.value
  if (multipart?.file_id) {
    try {
      await api.abortMultipartUpload({ file_id: multipart.file_id })
    } catch {
      // ignore
    } finally {
      activeMultipart.value = null
    }
  }

  if (!silent) {
    uploadResult.value = { success: false, message: t('upload.uploadCanceled') }
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

const formatDuration = (seconds) => {
  if (seconds < 60) return t('upload.seconds', { value: Number(seconds).toFixed(1) })
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return t('upload.minutesSeconds', { minutes: mins, seconds: secs })
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  return t('upload.hoursMinutes', { hours, minutes: mins })
}

const animateProgress = () => {
  const target = uploadProgress.value
  const current = displayProgress.value
  const diff = target - current
  if (Math.abs(diff) > 0.5) {
    displayProgress.value = Math.round(current + diff * 0.2)
    animationFrame = requestAnimationFrame(animateProgress)
  } else {
    displayProgress.value = Math.round(target)
    animationFrame = null
  }
}

const updateUploadStats = (loaded, total) => {
  const now = Date.now()
  uploadedSize.value = loaded
  totalSize.value = total
  const exactProgress = Math.round((loaded / total) * 100)
  uploadProgress.value = Math.min(exactProgress, 100)

  if (loaded >= total) {
    displayProgress.value = 100
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    return
  }

  if (!animationFrame && isUploading.value) {
    animationFrame = requestAnimationFrame(animateProgress)
  }

  const elapsed = (now - uploadStartTime) / 1000
  if (elapsed > 0.5) {
    const avgSpeed = loaded / elapsed
    uploadSpeed.value = formatBytes(avgSpeed) + '/s'
    if (avgSpeed > 0) {
      const remaining = (total - loaded) / avgSpeed
      if (remaining < 60)
        remainingTime.value = t('upload.secondsOnly', {
          value: Math.round(remaining),
        })
      else if (remaining < 3600)
        remainingTime.value = t('upload.minutesOnly', {
          value: Math.round(remaining / 60),
        })
      else
        remainingTime.value = t('upload.hoursOnly', {
          value: (remaining / 3600).toFixed(1),
        })
    } else {
      remainingTime.value = t('upload.calculating')
    }
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

const beforeUpload = ({ file }) => {
  if (file.file.size > MAX_FILE_SIZE) {
    message.error(t('upload.fileTooLarge'))
    return false
  }
  return true
}

const handleUpload = async ({ file }) => {
  currentFile.value = file
  uploadProgress.value = 0
  displayProgress.value = 0
  uploadResult.value = null
  isUploading.value = true
  cancelRequested.value = false
  activeMultipart.value = null
  abortInFlightRequests()
  uploadedSize.value = 0
  totalSize.value = file.file.size
  uploadSpeed.value = t('upload.preparing')
  remainingTime.value = t('upload.calculating')
  uploadStartTime = Date.now()
  animationFrame = null

  try {
    uploadRef.value?.clear()
    const fileSize = file.file.size

    if (fileSize < 100 * 1024 * 1024) {
      await uploadSmallFile(file)
    } else {
      await uploadLargeFile(file)
    }

    emit('uploaded', { filename: file.name })
  } catch (error) {
    if (isCancelledError(error) || cancelRequested.value) {
      uploadResult.value = { success: false, message: t('upload.uploadCanceled') }
    } else {
      console.error('上传错误:', error)
      uploadResult.value = {
        success: false,
        message: error.response?.data?.error || error.message || t('upload.uploadFailed'),
      }
    }
  } finally {
    isUploading.value = false
    abortInFlightRequests()
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
}

const uploadSmallFile = async (file) => {
  const response = await api.getUploadURL({
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.file.size,
    expires_in: expiresIn.value,
    require_login: requireLogin.value,
    config_id: selectedR2ConfigId.value || undefined,
  })

  const controller = registerController()
  try {
    await api.uploadToR2(
      response.upload_url,
      file.file,
      (_percent, loaded, total) => {
        updateUploadStats(loaded, total)
      },
      { signal: controller.signal }
    )
  } catch (error) {
    if (isCancelledError(error) || cancelRequested.value) {
      throw createCancelledError()
    }
    throw error
  } finally {
    inFlightControllers.delete(controller)
  }

  const uploadEndTime = Date.now()
  const duration = (uploadEndTime - uploadStartTime) / 1000
  const avgSpeed = file.file.size / duration

  uploadProgress.value = 100
  displayProgress.value = 100

  const confirmResult = await api.confirmUpload(response.file_id)
  const downloadUrl = confirmResult.download_url?.startsWith('http')
    ? confirmResult.download_url
    : window.location.origin + (confirmResult.download_url || response.download_url)

  uploadResult.value = {
    success: true,
    filename: file.name,
    downloadUrl: downloadUrl,
    shortUrl: window.location.origin + (confirmResult.short_url || response.short_url),
    fileSize: formatBytes(file.file.size),
    avgSpeed: formatBytes(avgSpeed) + '/s',
    duration: formatDuration(duration),
  }

  message.success(t('upload.uploadSuccess'))
}

const uploadLargeFile = async (file) => {
  let fileId = ''
  try {
    const initResponse = await api.initMultipartUpload({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      size: file.file.size,
      expires_in: expiresIn.value,
      require_login: requireLogin.value,
      config_id: selectedR2ConfigId.value || undefined,
    })

    const { file_id, upload_id, part_size, total_parts } = initResponse
    fileId = file_id
    activeMultipart.value = { file_id, upload_id }

    if (cancelRequested.value) {
      await cancelUpload({ silent: true })
      throw createCancelledError()
    }

    const CONCURRENCY = 3
    const partProgress = new Array(total_parts).fill(0)

    const updateTotalProgress = () => {
      const totalLoaded = partProgress.reduce((a, b) => a + b, 0)
      updateUploadStats(totalLoaded, file.file.size)
    }

    const uploadPart = async (partIndex) => {
      if (cancelRequested.value) {
        throw createCancelledError()
      }

      const partNumber = partIndex + 1
      const start = partIndex * part_size
      const end = Math.min(start + part_size, file.file.size)
      const chunk = file.file.slice(start, end)

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (cancelRequested.value) {
            throw createCancelledError()
          }

          const presignResponse = await api.getMultipartUploadURL({
            file_id,
            upload_id,
            part_number: partNumber,
          })

          if (cancelRequested.value) {
            throw createCancelledError()
          }

          const controller = registerController()
          try {
            const uploadResponse = await api.uploadToR2(
              presignResponse.upload_url,
              chunk,
              (_percent, loaded) => {
                partProgress[partIndex] = loaded
                updateTotalProgress()
              },
              { signal: controller.signal }
            )

            let etag = uploadResponse.headers?.etag || ''
            if (!etag)
              throw new Error(t('upload.errors.partMissingEtag', { partNumber: partNumber }))
            if (!etag.startsWith('"')) etag = `"${etag}"`

            partProgress[partIndex] = end - start
            updateTotalProgress()

            return { part_number: partNumber, etag }
          } finally {
            inFlightControllers.delete(controller)
          }
        } catch (err) {
          if (isCancelledError(err) || cancelRequested.value) {
            throw createCancelledError()
          }
          if (attempt === 3) throw err
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
    }

    const uploadedParts = []
    let currentIndex = 0

    const uploadNext = async () => {
      while (currentIndex < total_parts) {
        if (cancelRequested.value) {
          throw createCancelledError()
        }
        const partIndex = currentIndex++
        const result = await uploadPart(partIndex)
        uploadedParts.push(result)
      }
    }

    const workers = []
    for (let i = 0; i < Math.min(CONCURRENCY, total_parts); i++) {
      workers.push(uploadNext())
    }
    await Promise.all(workers)

    const validParts = uploadedParts
      .filter((p) => p && p.etag)
      .sort((a, b) => a.part_number - b.part_number)

    if (validParts.length !== total_parts) {
      throw new Error(
        t('upload.errors.incompleteMultipart', {
          uploaded: validParts.length,
          total: total_parts,
        })
      )
    }

    if (cancelRequested.value) {
      throw createCancelledError()
    }

    const completeResponse = await api.completeMultipartUpload({
      file_id,
      upload_id,
      parts: validParts,
    })

    const uploadEndTime = Date.now()
    const duration = (uploadEndTime - uploadStartTime) / 1000
    const avgSpeed = file.file.size / duration

    uploadProgress.value = 100
    displayProgress.value = 100

    const downloadUrl = completeResponse.download_url?.startsWith('http')
      ? completeResponse.download_url
      : window.location.origin + completeResponse.download_url

    uploadResult.value = {
      success: true,
      filename: file.name,
      downloadUrl: downloadUrl,
      shortUrl: window.location.origin + completeResponse.short_url,
      fileSize: formatBytes(file.file.size),
      avgSpeed: formatBytes(avgSpeed) + '/s',
      duration: formatDuration(duration),
    }

    message.success(t('upload.uploadSuccess'))
  } catch (error) {
    if (fileId) {
      try {
        await api.abortMultipartUpload({ file_id: fileId })
      } catch {
        // ignore
      } finally {
        if (activeMultipart.value?.file_id === fileId) {
          activeMultipart.value = null
        }
      }
    }
    throw error
  } finally {
    if (fileId && activeMultipart.value?.file_id === fileId) {
      activeMultipart.value = null
    }
  }
}

const copyShortUrl = () => {
  if (uploadResult.value?.shortUrl) {
    navigator.clipboard.writeText(uploadResult.value.shortUrl)
    message.success(t('upload.shortLinkCopied'))
  }
}

const copyDownloadUrl = () => {
  if (uploadResult.value?.downloadUrl) {
    navigator.clipboard.writeText(uploadResult.value.downloadUrl)
    message.success(t('upload.directLinkCopied'))
  }
}
</script>

<style scoped>
.upload-hint {
  color: var(--nb-gray-500);
  font-size: 14px;
  margin-top: var(--nb-space-sm);
}

.upload-options {
  display: grid;
  gap: var(--nb-space-md);
}

.upload-status {
  margin-top: var(--nb-space-lg);
}

.upload-info {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.upload-stats {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--nb-gray-500);
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
}

.upload-result {
  margin-top: var(--nb-space-lg);
}

.file-info {
  margin-bottom: var(--nb-space-md);
  font-size: 15px;
  word-break: break-all;
}

.upload-summary {
  display: flex;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
  margin-bottom: var(--nb-space-md);
}

.expire-note {
  font-size: 14px;
  color: var(--nb-gray-500);
  margin-bottom: var(--nb-space-md);
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

.link-row > :first-child {
  flex: 1;
}
</style>
