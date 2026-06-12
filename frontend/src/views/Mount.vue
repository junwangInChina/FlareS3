<template>
  <AppLayout>
    <div class="mount-page">
      <MountHeaderToolbar
        v-model:selected-config-id="selectedConfigId"
        v-model:prefix-input="prefixInput"
        :config-options="configOptions"
        :configs-loading="configsLoading"
        :loading="loading"
        :active-action="activeAction"
        :uploading="uploading"
        :is-mobile="isMobile"
        :view-mode="viewMode"
        @apply-prefix="handleApplyPrefix"
        @refresh="handleRefresh"
        @upload-file-change="handleUploadFileChange"
        @show-new-folder="showNewFolderModal"
        @set-view-mode="setViewMode"
      />

      <MountBrowserPanel
        :initial-page-loading="initialPageLoading"
        :view-mode="viewMode"
        :columns="columns"
        :rows="tableData"
        :loading="loading"
        :deleting="deleting"
        :configs-loading="configsLoading"
        :configs="configs"
        :selected-config-id="selectedConfigId"
        :prefix="prefix"
        :breadcrumb-items="breadcrumbItems"
        :page-number="pageNumber"
        :page-size="limit"
        :pagination-total="paginationTotal"
        :pagination-display-total="paginationDisplayTotal"
        :page-size-options="pageSizeOptions"
        :can-next="canNext"
        :active-action="activeAction"
        :deleting-key="deletingKey"
        :is-preview-supported="isPreviewSupported"
        :format-bytes="formatBytes"
        :format-date-time="formatDateTime"
        @go-root="goRoot"
        @go-up="goUp"
        @navigate="navigateToPrefix"
        @update:page="handlePaginationPageChange"
        @update:page-size="handlePaginationPageSizeChange"
        @open-folder="openFolder"
        @preview="openPreview"
        @download="downloadObject"
        @delete="handleDeleteObject"
        @load-more="nextPage"
      />

      <MountedObjectPreviewModal
        v-if="previewModalVisible"
        v-model:show="previewModalVisible"
        :config-id="selectedConfigId"
        :object-key="previewKey"
      />

      <MountDeleteConfirmModal
        :show="showDeleteModal"
        :title="deleteModalTitle"
        :confirm-text="deleteConfirmText"
        :deleting="deleting"
        @update:show="handleDeleteModalUpdate"
        @cancel="handleDeleteCancel"
        @confirm="handleDeleteConfirm"
      />

      <MountFolderModal
        :show="showFolderModal"
        v-model:folder-name="newFolderName"
        :creating="creatingFolder"
        @update:show="handleFolderModalUpdate"
        @cancel="closeFolderModal"
        @create="handleCreateFolder"
      />

      <MountUploadProgressModal
        :show="showUploadProgressModal"
        :uploading="uploading"
        :progress="uploadProgress"
        @update:show="handleUploadProgressModalUpdate"
      />
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import { useMessage } from '../composables/useMessage'
import { useResponsiveViewMode } from '../composables/useResponsiveViewMode.js'
import MountBrowserPanel from '../components/mount/MountBrowserPanel.vue'
import MountDeleteConfirmModal from '../components/mount/MountDeleteConfirmModal.vue'
import MountFolderModal from '../components/mount/MountFolderModal.vue'
import MountHeaderToolbar from '../components/mount/MountHeaderToolbar.vue'
import MountUploadProgressModal from '../components/mount/MountUploadProgressModal.vue'
import { buildMountTableColumns } from '../components/mount/mountTableColumns.js'
import {
  buildMountDownloadUrl,
  buildMountedObjectRows,
  formatMountBytes,
  formatMountDateTime,
  getMountObjectBasename,
  getMountParentPrefix,
  isMountedObjectPreviewSupported,
  normalizeMountPrefix,
} from '../utils/mountObjects.js'

const MountedObjectPreviewModal = defineAsyncComponent(
  () => import('../components/mount/MountedObjectPreviewModal.vue')
)

const { t, locale } = useI18n({ useScope: 'global' })
const message = useMessage()

const configsLoading = ref(false)
const configs = ref([])
const selectedConfigId = ref('')
const hasLoadedOnce = ref(false)

const prefix = ref('')
const prefixInput = ref('')

const limit = ref(20)
const pageSizeOptions = [10, 20, 50]

const tokenStack = ref([null])
const listResult = ref(null)
const loading = ref(false)
const activeAction = ref('')
const loadRequestSerial = ref(0)

const viewModeKey = 'flares3:mount-view-mode'
const { isMobile, viewMode, setViewMode } = useResponsiveViewMode({
  storageKey: viewModeKey,
  desktopDefault: 'table',
  mobileDefault: 'card',
})

const previewModalVisible = ref(false)
const previewKey = ref('')
const deleting = ref(false)
const deletingKey = ref('')

const showFolderModal = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

const uploading = ref(false)
const uploadProgress = ref(-1)
const showUploadProgressModal = ref(false)

const showDeleteModal = ref(false)
const pendingDeleteConfigId = ref('')
const pendingDeleteKey = ref('')
const pendingDeleteName = ref('')
const pendingDeleteIsFolder = ref(false)

const deleteModalTitle = computed(() =>
  pendingDeleteIsFolder.value ? t('mount.modals.deleteFolderTitle') : t('mount.modals.deleteTitle')
)

const deleteConfirmText = computed(() => {
  const key = pendingDeleteIsFolder.value ? 'mount.confirmDeleteFolder' : 'mount.confirmDelete'
  return t(key, { name: pendingDeleteName.value })
})

const configOptions = computed(() =>
  configs.value.map((row) => {
    const typeLabel =
      row.configType === 'r2' ? 'R2' : row.configType === 'koofr' ? 'Koofr' : 'WebDAV'
    const detailLabel =
      row.configType === 'r2'
        ? row.bucket_name || row.id
        : row.configType === 'koofr'
          ? row.remote_path && row.remote_path !== '/'
            ? row.remote_path
            : 'Koofr'
          : row.endpoint || row.id
    return {
      label: `${row.name || row.id} (${typeLabel}: ${detailLabel})`,
      value: row.id,
    }
  })
)

const currentToken = computed(() => tokenStack.value[tokenStack.value.length - 1] || '')
const pageNumber = computed(() => tokenStack.value.length)
const canPrev = computed(() => tokenStack.value.length > 1)
const canNext = computed(() => Boolean(listResult.value?.next_continuation_token))

const paginationTotal = computed(() => {
  const pageSize = Number(limit.value || 100)
  const pages = pageNumber.value + (canNext.value ? 1 : 0)
  return pageSize * pages
})

const paginationDisplayTotal = computed(() => {
  const pageSize = Number(limit.value || 100)
  const page = pageNumber.value
  const count = Number(listResult.value?.key_count || 0)
  const seen = Math.max(0, (page - 1) * pageSize + count)
  return canNext.value ? `${seen}+` : seen
})
const initialPageLoading = computed(
  () => !hasLoadedOnce.value && (configsLoading.value || loading.value)
)
const isPreviewSupported = isMountedObjectPreviewSupported
const formatBytes = formatMountBytes
const formatDateTime = (isoString) => formatMountDateTime(isoString, locale.value)

const breadcrumbItems = computed(() => {
  const raw = String(prefix.value || '')
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const parts = trimmed.split('/').filter(Boolean)
  const items = []
  let acc = ''
  for (const part of parts) {
    acc += `${part}/`
    items.push({ label: part, prefix: acc })
  }
  return items
})

const goRoot = async () => {
  await navigateToPrefix('')
}

const goUp = async () => {
  if (!prefix.value) return
  const parent = getMountParentPrefix(prefix.value)
  await navigateToPrefix(parent)
}

const openFolder = async (folderPrefix) => {
  await navigateToPrefix(String(folderPrefix || ''))
}

const loadObjects = async () => {
  const configId = String(selectedConfigId.value || '').trim()
  if (!configId) return false

  const requestSerial = ++loadRequestSerial.value
  loading.value = true

  try {
    const result = await api.listMountedObjects({
      configId,
      prefix: prefix.value,
      continuationToken: currentToken.value || undefined,
      limit: Number(limit.value || 100),
    })

    if (requestSerial !== loadRequestSerial.value) return false

    listResult.value = result
    hasLoadedOnce.value = true
    return true
  } catch (error) {
    if (requestSerial === loadRequestSerial.value) {
      message.error(error.response?.data?.error || t('mount.messages.loadObjectsFailed'))
    }
    return false
  } finally {
    if (requestSerial === loadRequestSerial.value) {
      loading.value = false
      activeAction.value = ''
    }
  }
}

const navigateToPrefix = async (value) => {
  if (loading.value) return

  prefix.value = normalizeMountPrefix(value)
  prefixInput.value = prefix.value
  tokenStack.value = [null]
  await loadObjects()
}

const handleApplyPrefix = async () => {
  await navigateToPrefix(prefixInput.value)
}

const handleRefresh = async () => {
  if (loading.value) return
  activeAction.value = 'refresh'
  tokenStack.value = [tokenStack.value[0]]
  await loadObjects()
}

const prevPage = async () => {
  if (loading.value) return
  if (!canPrev.value) return

  const removed = tokenStack.value.pop()
  const ok = await loadObjects()
  if (!ok) {
    tokenStack.value.push(removed)
  }
}

const nextPage = async () => {
  if (loading.value) return
  const nextToken = String(listResult.value?.next_continuation_token || '').trim()
  if (!nextToken) return

  activeAction.value = 'loadMore'
  tokenStack.value.push(nextToken)
  const ok = await loadObjects()
  if (!ok) {
    tokenStack.value.pop()
  }
}

const handlePaginationPageChange = async (targetPage) => {
  if (loading.value) return

  const nextPageNumber = Number(targetPage)
  if (!Number.isFinite(nextPageNumber) || nextPageNumber < 1) return

  const currentPageNumber = pageNumber.value
  if (nextPageNumber === currentPageNumber) return

  if (nextPageNumber < currentPageNumber) {
    if (nextPageNumber === currentPageNumber - 1) {
      await prevPage()
      return
    }

    const previousStack = [...tokenStack.value]
    tokenStack.value = tokenStack.value.slice(0, nextPageNumber)
    const ok = await loadObjects()
    if (!ok) {
      tokenStack.value = previousStack
    }
    return
  }

  if (nextPageNumber === currentPageNumber + 1) {
    await nextPage()
  }
}

const handlePaginationPageSizeChange = (value) => {
  const nextSize = Number(value)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  if (nextSize === Number(limit.value)) return
  limit.value = nextSize
}

const openPreview = (key) => {
  if (!isMountedObjectPreviewSupported(key)) {
    message.error(t('mount.preview.unsupported'))
    return
  }

  previewKey.value = String(key || '')
  previewModalVisible.value = true
}

const downloadObject = (key) => {
  const url = buildMountDownloadUrl(selectedConfigId.value, key)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  pendingDeleteConfigId.value = ''
  pendingDeleteKey.value = ''
  pendingDeleteName.value = ''
  pendingDeleteIsFolder.value = false
}

const handleDeleteModalUpdate = (nextValue) => {
  if (deleting.value) return
  if (!nextValue) {
    closeDeleteModal()
    return
  }
  showDeleteModal.value = true
}

const handleDeleteCancel = () => {
  if (deleting.value) return
  closeDeleteModal()
}

const handleDeleteObject = (key) => {
  const configId = String(selectedConfigId.value || '').trim()
  const objectKey = String(key || '').trim()

  if (!configId || !objectKey) return
  if (loading.value || deleting.value) return

  const isFolder = objectKey.endsWith('/')
  const folderKey = isFolder ? objectKey.slice(0, -1) : objectKey
  const displayNameBase = getMountObjectBasename(folderKey) || folderKey || objectKey
  const displayName = isFolder ? `${displayNameBase}/` : displayNameBase

  pendingDeleteConfigId.value = configId
  pendingDeleteKey.value = objectKey
  pendingDeleteName.value = displayName
  pendingDeleteIsFolder.value = isFolder
  showDeleteModal.value = true
}

const handleDeleteConfirm = async () => {
  if (deleting.value) return

  const configId = String(pendingDeleteConfigId.value || '').trim()
  const objectKey = String(pendingDeleteKey.value || '').trim()
  const isFolder = pendingDeleteIsFolder.value

  if (!configId || !objectKey) return

  deleting.value = true
  deletingKey.value = objectKey

  try {
    const result = await api.deleteMountedObject({ configId, key: objectKey })

    if (previewModalVisible.value && previewKey.value === objectKey) {
      previewModalVisible.value = false
      previewKey.value = ''
    }

    const previousStack = [...tokenStack.value]
    if (tokenStack.value.length > 1 && tableData.value.length <= 1) {
      tokenStack.value.pop()
    }

    const ok = await loadObjects()
    if (!ok) {
      tokenStack.value = previousStack
    }

    if (isFolder) {
      const deletedCount = Number(result?.deleted_count || 0)
      message.success(t('mount.messages.deleteFolderSuccess', { count: deletedCount }))
    } else {
      message.success(t('mount.messages.deleteSuccess'))
    }

    closeDeleteModal()
  } catch (error) {
    const fallbackKey = isFolder
      ? 'mount.messages.deleteFolderFailed'
      : 'mount.messages.deleteFailed'
    message.error(error.response?.data?.error || t(fallbackKey))
  } finally {
    deleting.value = false
    deletingKey.value = ''
  }
}

// ── 新建目录 ──

const showNewFolderModal = () => {
  if (loading.value || !selectedConfigId.value) return
  newFolderName.value = ''
  showFolderModal.value = true
}

const closeFolderModal = () => {
  if (creatingFolder.value) return
  showFolderModal.value = false
  newFolderName.value = ''
}

const handleFolderModalUpdate = (nextValue) => {
  if (creatingFolder.value) return
  if (!nextValue) {
    closeFolderModal()
    return
  }
  showFolderModal.value = true
}

const handleCreateFolder = async () => {
  const name = String(newFolderName.value || '').trim()
  if (!name) return
  if (creatingFolder.value) return

  const configId = String(selectedConfigId.value || '').trim()
  if (!configId) return

  // 构造 key: 当前 prefix + folder name
  const currentPrefix = String(prefix.value || '')
  const folderKey = `${currentPrefix}${name}/`

  creatingFolder.value = true
  try {
    await api.createMountedFolder({ configId, key: folderKey })
    message.success(t('mount.messages.folderCreateSuccess'))
    closeFolderModal()
    await handleRefresh()
  } catch (error) {
    message.error(error.response?.data?.error || t('mount.messages.folderCreateFailed'))
  } finally {
    creatingFolder.value = false
  }
}

// ── 上传文件 ──

const handleUploadFileChange = async (event) => {
  const files = event.target?.files
  if (!files || files.length === 0) return

  const file = files[0]
  const configId = String(selectedConfigId.value || '').trim()
  if (!configId) return

  // 检查文件大小 (100MB)
  const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
  if (file.size > MAX_UPLOAD_BYTES) {
    message.error(t('mount.messages.uploadTooLarge'))
    return
  }

  uploading.value = true
  uploadProgress.value = -1
  showUploadProgressModal.value = true

  try {
    const result = await api.uploadMountedObject({
      configId,
      path: prefix.value || '',
      file,
      onProgress: (percent) => {
        uploadProgress.value = percent
      },
    })

    // 如果后端返回 presigned URL (R2)，需要前端直传
    if (result.upload_url) {
      try {
        await api.uploadToR2(result.upload_url, file, (percent) => {
          uploadProgress.value = percent
        })
      } catch (uploadError) {
        message.error(t('mount.messages.uploadFailed'))
        return
      }
    }

    message.success(t('mount.messages.uploadSuccess'))
    uploadProgress.value = 100
    await handleRefresh()
  } catch (error) {
    message.error(error.response?.data?.error || t('mount.messages.uploadFailed'))
  } finally {
    uploading.value = false
    // 短暂延迟后关闭进度弹窗
    setTimeout(() => {
      if (!uploading.value) {
        showUploadProgressModal.value = false
        uploadProgress.value = -1
      }
    }, 800)
  }
}

const handleUploadProgressModalUpdate = (nextValue) => {
  if (uploading.value) return
  showUploadProgressModal.value = nextValue
}

const tableData = computed(() => {
  return buildMountedObjectRows({
    basePrefix: prefix.value,
    folders: listResult.value?.folders,
    objects: listResult.value?.objects,
  })
})

const columns = computed(() =>
  buildMountTableColumns({
    t,
    locale: locale.value,
    loading: loading.value,
    deleting: deleting.value,
    deletingKey: deletingKey.value,
    onOpenFolder: openFolder,
    onOpenPreview: openPreview,
    onDownloadObject: downloadObject,
    onDeleteObject: handleDeleteObject,
  })
)

const loadConfigs = async () => {
  configsLoading.value = true
  try {
    const result = await api.getStorageConfigs()

    configs.value = (result.configs || []).map((row) => ({
      ...row,
      configType: row.type, // 'r2' | 'webdav' | 'koofr'
    }))

    if (!selectedConfigId.value) {
      selectedConfigId.value =
        String(result.default_config_id || '').trim() || String(configs.value?.[0]?.id || '').trim()
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('mount.messages.loadConfigsFailed'))
  } finally {
    configsLoading.value = false
  }
}

watch(
  () => selectedConfigId.value,
  async (value) => {
    previewModalVisible.value = false
    previewKey.value = ''
    closeDeleteModal()

    if (!value) {
      listResult.value = null
      tokenStack.value = [null]
      return
    }

    prefix.value = ''
    prefixInput.value = ''
    tokenStack.value = [null]
    await loadObjects()
  }
)

watch(
  () => prefixInput.value,
  async (value, previousValue) => {
    if (loading.value) return

    const normalizedValue = normalizeMountPrefix(value)
    const normalizedPreviousValue = normalizeMountPrefix(previousValue)

    if (normalizedValue) return
    if (!normalizedPreviousValue) return
    if (!prefix.value) return

    await navigateToPrefix('')
  }
)

watch(
  () => limit.value,
  async () => {
    if (!selectedConfigId.value) return
    tokenStack.value = [null]
    await loadObjects()
  }
)

onMounted(async () => {
  prefixInput.value = prefix.value
  await loadConfigs()
})
</script>

<style scoped>
.mount-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}
@media (max-width: 768px) {
  .mount-page {
    overflow-x: hidden;
    overflow-x: clip;
  }
}
</style>
