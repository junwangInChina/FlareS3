<template>
  <div class="upload-panel">
    <div
      class="upload-entry"
      :class="{ 'is-disabled': isUploadEntryDisabled }"
      :aria-disabled="isUploadEntryDisabled ? 'true' : 'false'"
    >
      <Upload
        ref="uploadRef"
        multiple
        @file-selected="handleUpload"
        @before-upload="beforeUpload"
      >
        <p class="upload-hint">{{ t('upload.hint5gb') }}</p>
      </Upload>
    </div>

    <Alert v-if="uploadConfigAlertMessage" type="warning" class="upload-config-alert">
      {{ uploadConfigAlertMessage }}
    </Alert>

    <Divider />

    <div class="upload-options">
      <FormItem :label="t('upload.expiresIn')">
        <Radio v-model="expiresIn" :options="expiresOptions" name="expires" />
      </FormItem>

      <FormItem v-if="r2ConfigOptions.length > 1" :label="t('upload.r2Config')">
        <Select
          v-model="selectedR2ConfigId"
          :options="r2ConfigOptions"
          :disabled="r2OptionsLoading"
        />
      </FormItem>
      <FormItem v-else-if="r2ConfigOptions.length === 1" :label="t('upload.r2Config')">
        <div class="selected-config-label">{{ selectedR2ConfigLabel }}</div>
      </FormItem>

      <FormItem :label="t('upload.downloadPermission')">
        <Switch
          v-model="requireLogin"
          :checked-text="t('upload.requireLogin')"
          :unchecked-text="t('upload.publicDownload')"
        />
      </FormItem>
    </div>

    <UploadQueueList
      v-if="queueItems.length > 0"
      class="upload-queue-block"
      :items="queueItems"
      @cancel="cancelQueueItem"
      @retry="retryQueueItem"
      @remove="removeQueueItem"
    />

    <div v-if="latestSuccessResult" class="upload-result">
      <Alert type="success">
        <div class="file-info">
          <strong>📄 {{ latestSuccessResult.filename }}</strong>
        </div>
        <div class="upload-summary">
          <Tag type="info">{{ latestSuccessResult.fileSize }}</Tag>
          <Tag type="success">{{ latestSuccessResult.avgSpeed }}</Tag>
          <Tag type="warning">{{ latestSuccessResult.duration }}</Tag>
        </div>
        <p class="expire-note">
          {{ latestSuccessExpireText }}
        </p>

        <div class="link-group">
          <label class="link-label">{{ t('upload.shortLink') }}</label>
          <div class="link-row">
            <Input :model-value="latestSuccessResult.shortUrl" readonly size="small" />
            <Button type="primary" size="small" @click="copyShortUrl">
              {{ t('upload.copy') }}
            </Button>
          </div>
        </div>

        <div class="link-group">
          <label class="link-label">{{ t('upload.directLink') }}</label>
          <div class="link-row">
            <Input :model-value="latestSuccessResult.downloadUrl" readonly size="small" />
            <Button type="default" size="small" @click="copyDownloadUrl">
              {{ t('upload.copy') }}
            </Button>
          </div>
        </div>
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
import Tag from '../ui/tag/Tag.vue'
import Input from '../ui/input/Input.vue'
import Button from '../ui/button/Button.vue'
import UploadQueueList from './UploadQueueList.vue'
import { useMessage } from '../../composables/useMessage'
import { useUploadQueue } from '../../composables/useUploadQueue.js'
import { resolveUploadErrorMessage } from '../../utils/uploadErrors.js'

const emit = defineEmits(['uploaded'])

const message = useMessage()
const { t, locale } = useI18n({ useScope: 'global' })

const uploadRef = ref(null)
const expiresIn = ref(7)
const requireLogin = ref(true)

const selectedR2ConfigId = ref('')
const r2ConfigOptions = ref([])
const r2OptionsLoading = ref(false)

const hasAvailableUploadConfig = computed(() => r2ConfigOptions.value.length > 0)
const isSelectedR2ConfigValid = computed(() =>
  r2ConfigOptions.value.some((option) => option.value === selectedR2ConfigId.value)
)
const selectedR2ConfigLabel = computed(
  () => r2ConfigOptions.value.find((option) => option.value === selectedR2ConfigId.value)?.label || ''
)
const resolvedUploadConfigId = computed(() =>
  isSelectedR2ConfigValid.value ? selectedR2ConfigId.value : ''
)
const isUploadEntryDisabled = computed(() => r2OptionsLoading.value || !hasAvailableUploadConfig.value)
const uploadConfigAlertMessage = computed(() => {
  if (!r2OptionsLoading.value && !hasAvailableUploadConfig.value) {
    return locale.value.startsWith('zh')
      ? '当前没有可用上传配置，请联系管理员。'
      : 'No upload configuration is available. Please contact an administrator.'
  }
  return ''
})
const uploadConfigLoadingMessage = computed(() =>
  locale.value.startsWith('zh')
    ? '上传配置加载中，请稍后重试。'
    : 'Upload configuration is still loading. Please try again later.'
)

const expiresOptions = computed(() =>
  [1, 3, 7, 30, 0].map((value) => ({
    label: value === 0 ? t('upload.expireNever') : t('upload.expireDays', { days: value }),
    value,
  }))
)

const latestSuccessExpireText = computed(() => {
  const expiresValue = Number(latestSuccessResult.value?.expiresIn ?? expiresIn.value)
  return expiresValue === 0
    ? t('upload.fileNeverExpire')
    : t('upload.fileExpire', { days: expiresValue })
})

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024
const MULTIPART_THRESHOLD = 100 * 1024 * 1024
const PART_UPLOAD_RETRY_COUNT = 3

const createCancelledError = () => new Error('UPLOAD_CANCELLED')

const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'CanceledError' ||
  error?.message === 'UPLOAD_CANCELLED'

const formatBytes = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const unit = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(unit)), sizes.length - 1)
  return `${(value / Math.pow(unit, index)).toFixed(2)} ${sizes[index]}`
}

const formatDuration = (seconds) => {
  if (seconds < 60) return t('upload.seconds', { value: Number(seconds).toFixed(1) })
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return t('upload.minutesSeconds', { minutes, seconds: remainingSeconds })
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return t('upload.hoursMinutes', { hours, minutes })
}

const formatRemainingTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return t('upload.calculating')
  }
  if (seconds < 60) {
    return t('upload.secondsOnly', {
      value: Math.round(seconds),
    })
  }
  if (seconds < 3600) {
    return t('upload.minutesOnly', {
      value: Math.round(seconds / 60),
    })
  }
  return t('upload.hoursOnly', {
    value: (seconds / 3600).toFixed(1),
  })
}

const createTaskState = () => ({
  uploadStartTime: Date.now(),
  activeMultipart: null,
  cancelRequested: false,
  inFlightControllers: new Set(),
})

const registerController = (taskState) => {
  const controller = new AbortController()
  taskState.inFlightControllers.add(controller)
  return controller
}

const abortInFlightRequests = (taskState) => {
  for (const controller of taskState.inFlightControllers) {
    try {
      controller.abort()
    } catch {
      // ignore
    }
  }
  taskState.inFlightControllers.clear()
}

const ensureTaskActive = (taskState, isCancelled) => {
  if (taskState.cancelRequested || isCancelled()) {
    throw createCancelledError()
  }
}

const cancelTask = async (taskState) => {
  if (taskState.cancelRequested) return

  taskState.cancelRequested = true
  abortInFlightRequests(taskState)

  const multipart = taskState.activeMultipart
  if (multipart?.file_id) {
    try {
      await api.abortMultipartUpload({ file_id: multipart.file_id })
    } catch {
      // ignore
    } finally {
      taskState.activeMultipart = null
    }
  }
}

const updateUploadStats = (taskState, taskFile, updateItem, loaded, total) => {
  const totalBytes = Number(total || taskFile.size || 0)
  const uploadedBytes = Math.max(0, Number(loaded || 0))
  const progress = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0
  const elapsedSeconds = Math.max((Date.now() - taskState.uploadStartTime) / 1000, 0.001)
  const avgSpeed = uploadedBytes / elapsedSeconds
  const remainingSeconds = avgSpeed > 0 ? (totalBytes - uploadedBytes) / avgSpeed : Number.NaN

  updateItem({
    progress,
    uploadedBytes,
    totalBytes,
    speed: uploadedBytes > 0 ? `${formatBytes(avgSpeed)}/s` : t('upload.preparing'),
    remainingTime:
      uploadedBytes >= totalBytes ? t('upload.secondsOnly', { value: 0 }) : formatRemainingTime(remainingSeconds),
  })
}

const resolveTaskResult = (taskFile, response, completedResult, taskState) => {
  const durationSeconds = Math.max((Date.now() - taskState.uploadStartTime) / 1000, 0.001)
  const avgSpeed = taskFile.size / durationSeconds
  const resolvedFilename = completedResult.filename || response.filename || taskFile.name
  const downloadUrl = completedResult.download_url?.startsWith('http')
    ? completedResult.download_url
    : window.location.origin + (completedResult.download_url || response.download_url)
  const shortUrlPath = completedResult.short_url || response.short_url

  return {
    success: true,
    filename: resolvedFilename,
    downloadUrl,
    shortUrl: shortUrlPath?.startsWith('http') ? shortUrlPath : window.location.origin + shortUrlPath,
    fileSize: formatBytes(taskFile.size),
    avgSpeed: `${formatBytes(avgSpeed)}/s`,
    duration: formatDuration(durationSeconds),
    expiresIn: taskFile.expiresIn,
  }
}

const uploadSmallFile = async (taskFile, taskState, updateItem, isCancelled) => {
  const response = await api.getUploadURL({
    filename: taskFile.name,
    content_type: taskFile.type || 'application/octet-stream',
    size: taskFile.size,
    expires_in: taskFile.expiresIn,
    require_login: taskFile.requireLogin,
    config_id: taskFile.configId || undefined,
  })

  ensureTaskActive(taskState, isCancelled)

  const controller = registerController(taskState)
  try {
    await api.uploadToR2(
      response.upload_url,
      taskFile.rawFile,
      (_percent, loaded, total) => {
        updateUploadStats(taskState, taskFile, updateItem, loaded, total)
      },
      { signal: controller.signal }
    )
  } finally {
    taskState.inFlightControllers.delete(controller)
  }

  ensureTaskActive(taskState, isCancelled)

  const confirmResult = await api.confirmUpload(response.file_id)
  ensureTaskActive(taskState, isCancelled)

  return resolveTaskResult(taskFile, response, confirmResult, taskState)
}

const uploadLargeFile = async (taskFile, taskState, updateItem, isCancelled) => {
  let fileId = ''

  try {
    const initResponse = await api.initMultipartUpload({
      filename: taskFile.name,
      content_type: taskFile.type || 'application/octet-stream',
      size: taskFile.size,
      expires_in: taskFile.expiresIn,
      require_login: taskFile.requireLogin,
      config_id: taskFile.configId || undefined,
    })

    const { file_id, upload_id, part_size, total_parts } = initResponse
    fileId = file_id
    taskState.activeMultipart = { file_id, upload_id }

    for (let partIndex = 0; partIndex < total_parts; partIndex += 1) {
      ensureTaskActive(taskState, isCancelled)

      const partNumber = partIndex + 1
      const start = partIndex * part_size
      const end = Math.min(start + part_size, taskFile.size)
      const chunk = taskFile.rawFile.slice(start, end)

      let lastError = null
      for (let attempt = 1; attempt <= PART_UPLOAD_RETRY_COUNT; attempt += 1) {
        try {
          ensureTaskActive(taskState, isCancelled)

          const presignResponse = await api.getMultipartUploadURL({
            file_id,
            upload_id,
            part_number: partNumber,
          })

          ensureTaskActive(taskState, isCancelled)

          const controller = registerController(taskState)
          try {
            const uploadResponse = await api.uploadToR2(
              presignResponse.upload_url,
              chunk,
              (_percent, loaded) => {
                updateUploadStats(taskState, taskFile, updateItem, start + loaded, taskFile.size)
              },
              { signal: controller.signal }
            )

            let etag = uploadResponse.headers?.etag || ''
            if (!etag) {
              throw new Error(t('upload.errors.partMissingEtag', { partNumber }))
            }
            if (!etag.startsWith('"')) {
              etag = `"${etag}"`
            }

            updateUploadStats(taskState, taskFile, updateItem, end, taskFile.size)
            initResponse.parts = [...(initResponse.parts || []), { part_number: partNumber, etag }]
            lastError = null
            break
          } finally {
            taskState.inFlightControllers.delete(controller)
          }
        } catch (error) {
          if (isCancelledError(error) || taskState.cancelRequested || isCancelled()) {
            throw createCancelledError()
          }
          lastError = error
          if (attempt < PART_UPLOAD_RETRY_COUNT) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          }
        }
      }

      if (lastError) {
        throw lastError
      }
    }

    ensureTaskActive(taskState, isCancelled)

    const completeResult = await api.completeMultipartUpload({
      file_id,
      upload_id,
      parts: initResponse.parts || [],
    })

    ensureTaskActive(taskState, isCancelled)

    return resolveTaskResult(taskFile, initResponse, completeResult, taskState)
  } catch (error) {
    if (fileId) {
      try {
        await api.abortMultipartUpload({ file_id: fileId })
      } catch {
        // ignore
      } finally {
        if (taskState.activeMultipart?.file_id === fileId) {
          taskState.activeMultipart = null
        }
      }
    }
    throw error
  } finally {
    if (fileId && taskState.activeMultipart?.file_id === fileId) {
      taskState.activeMultipart = null
    }
  }
}

const uploadQueue = useUploadQueue({
  runTask: async (item, { updateItem, setCancel, isCancelled }) => {
    const taskFile = item.file
    const taskState = createTaskState()

    updateItem({
      progress: 0,
      uploadedBytes: 0,
      totalBytes: taskFile.size,
      speed: t('upload.preparing'),
      remainingTime: t('upload.calculating'),
    })

    setCancel(() => {
      void cancelTask(taskState)
    })

    try {
      const result =
        taskFile.size < MULTIPART_THRESHOLD
          ? await uploadSmallFile(taskFile, taskState, updateItem, isCancelled)
          : await uploadLargeFile(taskFile, taskState, updateItem, isCancelled)

      message.success(t('upload.uploadSuccess'))
      emit('uploaded', { filename: taskFile.name })
      return result
    } catch (error) {
      if (isCancelledError(error) || taskState.cancelRequested || isCancelled()) {
        throw createCancelledError()
      }
      throw new Error(resolveUploadErrorMessage(error, t('upload.uploadFailed')))
    } finally {
      abortInFlightRequests(taskState)
    }
  },
})

const queueItems = computed(() => uploadQueue.items.value)
const latestSuccessResult = computed(() => uploadQueue.latestSuccessItem.value?.result || null)

const beforeUpload = ({ files }) => {
  if (r2OptionsLoading.value) {
    message.warning(uploadConfigLoadingMessage.value)
    return false
  }
  if (!hasAvailableUploadConfig.value || !resolvedUploadConfigId.value) {
    message.error(uploadConfigAlertMessage.value)
    return false
  }

  const invalidFile = files.find((item) => Number(item?.file?.size || 0) > MAX_FILE_SIZE)
  if (invalidFile) {
    message.error(t('upload.fileTooLarge'))
    return false
  }

  return true
}

const buildQueuedFiles = (files = []) =>
  files.map((item) => ({
    rawFile: item.file,
    name: item.name,
    type: item.type || item.file?.type || 'application/octet-stream',
    size: Number(item.file?.size || 0),
    expiresIn: expiresIn.value,
    requireLogin: requireLogin.value,
    configId: resolvedUploadConfigId.value || undefined,
  }))

const handleUpload = ({ files }) => {
  if (!resolvedUploadConfigId.value) {
    message.error(uploadConfigAlertMessage.value)
    return
  }

  const queuedFiles = buildQueuedFiles(files)
  if (!queuedFiles.length) {
    return
  }

  uploadRef.value?.clear()
  uploadQueue.enqueueFiles(queuedFiles)
}

const cancelQueueItem = (itemId) => {
  uploadQueue.cancelItem(itemId)
}

const retryQueueItem = (itemId) => {
  uploadQueue.retryItem(itemId)
}

const removeQueueItem = (itemId) => {
  uploadQueue.removeItem(itemId)
}

const copyShortUrl = () => {
  if (latestSuccessResult.value?.shortUrl) {
    navigator.clipboard.writeText(latestSuccessResult.value.shortUrl)
    message.success(t('upload.shortLinkCopied'))
  }
}

const copyDownloadUrl = () => {
  if (latestSuccessResult.value?.downloadUrl) {
    navigator.clipboard.writeText(latestSuccessResult.value.downloadUrl)
    message.success(t('upload.directLinkCopied'))
  }
}

onMounted(async () => {
  try {
    r2OptionsLoading.value = true
    const result = await api.getR2Options()
    const options = Array.isArray(result.options) ? result.options : []
    r2ConfigOptions.value = options.map((option) => ({
      label: option.name,
      value: option.id,
    }))

    const defaultConfigId =
      typeof result.default_config_id === 'string' &&
      options.some((option) => option.id === result.default_config_id)
        ? result.default_config_id
        : ''
    selectedR2ConfigId.value = defaultConfigId || options[0]?.id || ''
  } catch (error) {
    r2ConfigOptions.value = []
    selectedR2ConfigId.value = ''
    console.error('加载 R2 配置选项失败:', error)
    message.error(t('upload.loadR2OptionsFailed'))
  } finally {
    r2OptionsLoading.value = false
  }
})

onUnmounted(() => {
  uploadQueue.dispose()
})
</script>

<style scoped>
.upload-entry.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.upload-hint {
  color: var(--nb-gray-500);
  font-size: 14px;
  margin-top: var(--nb-space-sm);
}

.upload-config-alert {
  margin-top: var(--nb-space-md);
}

.upload-options {
  display: grid;
  gap: var(--nb-space-md);
}

.selected-config-label {
  min-height: 32px;
  display: flex;
  align-items: center;
  color: var(--nb-text, var(--foreground));
  word-break: break-all;
}

.upload-queue-block {
  margin-top: var(--nb-space-lg);
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
