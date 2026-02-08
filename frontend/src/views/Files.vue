<template>
  <AppLayout>
    <div class="files-page">
      <header class="files-header">
        <div class="files-title-group">
          <div class="files-title-row">
            <h1 class="files-title">{{ t('files.title') }}</h1>
            <Button
              type="ghost"
              size="small"
              class="files-upload-btn"
              :aria-label="t('files.uploadFile')"
              @click="showUploadModal = true"
            >
              <Upload :size="18" />
            </Button>
          </div>
          <p class="files-subtitle">
            {{ t('files.subtitle') }}
          </p>
        </div>

        <div class="files-actions">
          <div class="filter-row">
            <div class="filter-item filename">
              <Input
                v-model="filters.filename"
                :placeholder="t('files.filters.filename')"
                size="small"
                clearable
                @keyup.enter="handleSearch"
              />
            </div>

            <div v-if="authStore.isAdmin" class="filter-item owner">
              <Select
                v-model="filters.owner_id"
                :options="ownerOptions"
                size="small"
                :disabled="usersLoading"
              />
            </div>

            <div class="filter-item status">
              <Select v-model="filters.upload_status" :options="statusOptions" size="small" />
            </div>

            <div class="filter-item created-range">
              <DateRangePicker
                v-model:startValue="filters.created_from_date"
                v-model:endValue="filters.created_to_date"
                size="small"
                clearable
              />
            </div>

            <Button
              type="default"
              size="small"
              :loading="filesStore.loading && activeAction === 'search'"
              :disabled="filesStore.loading || deleting"
              @click="handleSearch"
            >
              <Search :size="16" style="margin-right: 6px" />
              {{ t('common.search') }}
            </Button>
            <Button
              type="default"
              size="small"
              :loading="filesStore.loading && activeAction === 'refresh'"
              :disabled="filesStore.loading || deleting"
              @click="handleRefresh"
            >
              <RefreshCw :size="16" style="margin-right: 6px" />
              {{ t('common.refresh') }}
            </Button>

            <div class="filter-item view-mode">
              <div class="view-mode-toggle" role="group" aria-label="View mode">
                <Tooltip :content="t('files.viewMode.table')">
                  <Button
                    type="ghost"
                    size="small"
                    class="view-mode-btn"
                    :class="{ 'is-active': viewMode === 'table' }"
                    :disabled="filesStore.loading || deleting"
                    :aria-label="t('files.viewMode.table')"
                    @click="setViewMode('table')"
                  >
                    <Table2 :size="18" />
                  </Button>
                </Tooltip>
                <Tooltip :content="t('files.viewMode.card')">
                  <Button
                    type="ghost"
                    size="small"
                    class="view-mode-btn"
                    :class="{ 'is-active': viewMode === 'card' }"
                    :disabled="filesStore.loading || deleting"
                    :aria-label="t('files.viewMode.card')"
                    @click="setViewMode('card')"
                  >
                    <LayoutGrid :size="18" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section class="files-content">
        <FilesTableView
          v-if="viewMode === 'table'"
          :columns="columns"
          :data="filesStore.files"
          :loading="tableLoading"
          :total="filesStore.total"
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :disabled="filesStore.loading || deleting"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />

        <FilesCardView
          v-else
          :files="filesStore.files"
          :loading="filesStore.loading || deleting"
          :initial-loading="tableLoading"
          :has-more="hasMore"
          :active-action="activeAction"
          :is-admin="authStore.isAdmin"
          @show-info="showFileInfo"
          @share="showFileShare"
          @delete="handleDelete"
          @load-more="loadMore"
        />
      </section>

      <FileInfoModal v-model:show="showInfoModal" :file="selectedFile" />

      <FileUploadModal v-model:show="showUploadModal" @uploaded="handleUploaded" />

      <FileShareModal
        v-model:show="showShareModal"
        :file-id="sharingFileId"
        :filename="sharingFilename"
      />

      <Modal
        :show="showDeleteModal"
        :title="t('files.modals.deleteTitle')"
        width="420px"
        @update:show="handleDeleteModalUpdate"
      >
        <p class="files-delete-confirm">
          {{ deleteConfirmText }}
        </p>

        <template #footer>
          <Button type="default" :disabled="deleting" @click="handleDeleteCancel">
            {{ t('common.cancel') }}
          </Button>
          <Button type="danger" :loading="deleting" @click="handleDeleteConfirm">
            {{ t('files.actions.delete') }}
          </Button>
        </template>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted, computed, watch } from 'vue'
import {
  Info,
  Trash2,
  RefreshCw,
  Search,
  Upload,
  LayoutGrid,
  Table2,
  Share2,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useFilesStore } from '../stores/files'
import { useThemeStore } from '../stores/theme'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import FilesTableView from '../components/files/FilesTableView.vue'
import FilesCardView from '../components/files/FilesCardView.vue'
import FileInfoModal from '../components/files/FileInfoModal.vue'
import FileUploadModal from '../components/files/FileUploadModal.vue'
import FileShareModal from '../components/files/FileShareModal.vue'
import Button from '../components/ui/button/Button.vue'
import Modal from '../components/ui/modal/Modal.vue'
import Select from '../components/ui/select/Select.vue'
import Input from '../components/ui/input/Input.vue'
import DateRangePicker from '../components/ui/date-range-picker/DateRangePicker.vue'
import Tag from '../components/ui/tag/Tag.vue'
import Tooltip from '../components/ui/tooltip/Tooltip.vue'
import { useMessage } from '../composables/useMessage'

const authStore = useAuthStore()
const filesStore = useFilesStore()
const themeStore = useThemeStore()
const message = useMessage()
const { t, locale } = useI18n({ useScope: 'global' })

const showInfoModal = ref(false)
const selectedFile = ref(null)
const showUploadModal = ref(false)
const showShareModal = ref(false)
const sharingFileId = ref('')
const sharingFilename = ref('')

const showDeleteModal = ref(false)
const deleting = ref(false)
const pendingDeleteId = ref('')

const deleteConfirmText = computed(() => t('files.confirmDelete'))

const filters = ref({
  filename: '',
  owner_id: '',
  upload_status: '',
  created_from_date: '',
  created_to_date: '',
})

const viewModeKey = 'flares3:files-view-mode'
const viewMode = ref('table')

const setViewMode = (mode) => {
  if (mode !== 'table' && mode !== 'card') {
    return
  }
  viewMode.value = mode
}

const usersLoading = ref(false)
const users = ref([])
const ownerOptions = computed(() => [
  { label: t('files.filters.allOwners'), value: '' },
  ...users.value.map((u) => ({ label: u.username, value: u.id })),
])

const statusOptions = computed(() => [
  { label: t('files.filters.allStatus'), value: '' },
  { label: t('files.status.valid'), value: 'completed' },
  { label: t('files.status.invalid'), value: 'deleted' },
])

const activeAction = ref('')
const hasLoadedOnce = ref(false)
const tableLoading = computed(() => filesStore.loading && !hasLoadedOnce.value)

const pagination = ref({ page: 1, pageSize: 20 })

const hasMore = computed(() => filesStore.files.length < Number(filesStore.total || 0))

const formatDateTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale.value)
}

const isFileDeleted = (row) => row?.upload_status === 'deleted'

const getExpiresText = (row) => {
  const expiresIn = Number(row?.expires_in)
  if (!Number.isFinite(expiresIn)) return '-'
  return expiresIn === -30
    ? t('files.expires.seconds', { value: 30 })
    : t('files.expires.days', { days: expiresIn })
}

const getRemainingText = (row) => {
  if (isFileDeleted(row)) return '-'
  const text = String(row?.remaining_time ?? '').trim()
  return text ? text : '-'
}

const getFileStatus = (row) => {
  const deleted = isFileDeleted(row)
  const expiresAt = row?.expires_at ? new Date(row.expires_at).getTime() : Number.NaN
  const expired = !deleted && Number.isFinite(expiresAt) && Date.now() > expiresAt

  const text = deleted
    ? t('files.status.invalid')
    : expired
    ? t('files.status.expired')
    : t('files.status.valid')
  const tagType = deleted ? 'danger' : expired ? 'warning' : 'success'

  return { deleted, expired, text, tagType }
}

const columns = computed(() => [
  {
    title: t('files.columns.filename'),
    key: 'filename',
    align: 'left',
    render: (row) => h(Tooltip, { content: row.filename }, () => row.filename),
  },
  {
    title: t('files.columns.size'),
    key: 'size',
    width: 100,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const sizeText = formatBytes(row.size)
      return h('span', sizeText)
    },
  },
  {
    title: t('files.columns.expires'),
    key: 'expires_in',
    width: 80,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      return h('span', getExpiresText(row))
    },
  },
  {
    title: t('files.columns.status'),
    key: 'status',
    width: 80,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const { text, tagType } = getFileStatus(row)
      return h(
        Tag,
        {
          type: tagType,
          size: 'small',
        },
        () => text
      )
    },
  },
  {
    title: t('files.columns.remaining'),
    key: 'remaining_time',
    width: 160,
    align: 'center',
    render: (row) => {
      const text = getRemainingText(row)
      return h(Tooltip, { content: text }, () => text)
    },
  },
  {
    title: t('files.columns.uploadedAt'),
    key: 'created_at',
    width: 160,
    align: 'center',
    render: (row) => {
      const text = formatDateTime(row.created_at)
      return h(Tooltip, { content: text }, () => text)
    },
  },
  ...(authStore.isAdmin
    ? [
        {
          title: t('files.columns.owner'),
          key: 'owner',
          width: 120,
          align: 'center',
          ellipsis: false,
          render: (row) => {
            const text = row.owner_username || row.owner_id
            return h('span', text)
          },
        },
      ]
    : []),
  {
    title: t('files.columns.actions'),
    key: 'actions',
    width:
      locale.value === 'zh-CN'
        ? themeStore.uiTheme === 'shadcn'
          ? 280
          : 330
        : themeStore.uiTheme === 'shadcn'
        ? 330
        : 380,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const disabled = filesStore.loading || deleting.value || isFileDeleted(row)
      return h('div', { class: 'action-buttons' }, [
        h(
          Button,
          {
            size: 'small',
            type: 'default',
            disabled,
            onClick: () => showFileInfo(row),
          },
          () => [h(Info, { size: 16, style: 'margin-right: 4px' }), t('common.details')]
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'default',
            disabled,
            onClick: () => showFileShare(row),
          },
          () => [h(Share2, { size: 16, style: 'margin-right: 4px' }), t('files.actions.share')]
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'danger',
            disabled,
            onClick: () => handleDelete(row.id),
          },
          () => [h(Trash2, { size: 16, style: 'margin-right: 4px' }), t('files.actions.delete')]
        ),
      ])
    },
  },
])

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const showFileInfo = (row) => {
  if (!row) return
  if (isFileDeleted(row)) return
  selectedFile.value = row
  showInfoModal.value = true
}

const showFileShare = (row) => {
  if (!row) return
  if (isFileDeleted(row)) return
  sharingFileId.value = String(row.id ?? '')
  sharingFilename.value = String(row.filename ?? '')
  showShareModal.value = true
}

const toIsoStartOfDay = (dateValue) => {
  const local = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(local.getTime())) return null
  return local.toISOString()
}

const addOneDayIso = (isoString) => {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

const buildQueryParams = () => {
  const params = {}

  const filename = filters.value.filename?.trim()
  if (filename) params.filename = filename

  if (authStore.isAdmin && filters.value.owner_id) {
    params.owner_id = filters.value.owner_id
  }

  if (filters.value.upload_status) {
    params.upload_status = filters.value.upload_status
  }

  const createdFromDate = filters.value.created_from_date
  const createdToDate = filters.value.created_to_date

  if (createdFromDate || createdToDate) {
    let fromDate = createdFromDate
    let toDate = createdToDate

    if (fromDate && toDate && fromDate > toDate) {
      ;[fromDate, toDate] = [toDate, fromDate]
    }

    const fromIso = fromDate ? toIsoStartOfDay(fromDate) : null
    const toBaseIso = toDate ? toIsoStartOfDay(toDate) : null
    const toIso = toBaseIso ? addOneDayIso(toBaseIso) : null

    if (fromIso && toIso) {
      params.created_from = fromIso
      params.created_to = toIso
    } else if (fromIso) {
      const singleTo = addOneDayIso(fromIso)
      if (singleTo) {
        params.created_from = fromIso
        params.created_to = singleTo
      }
    } else if (toIso && toBaseIso) {
      params.created_from = toBaseIso
      params.created_to = toIso
    }
  }

  return params
}

const loadUsers = async () => {
  if (!authStore.isAdmin) return
  if (users.value.length) return
  usersLoading.value = true
  try {
    const result = await api.getUsers({ page: 1, limit: 100 })
    users.value = (result.users || []).filter((u) => u.status !== 'deleted')
  } catch (error) {
    message.error(t('files.messages.loadUsersFailed'))
  } finally {
    usersLoading.value = false
  }
}

const loadFiles = async ({ page = pagination.value.page, append = false } = {}) => {
  try {
    await filesStore.fetchFiles(page, pagination.value.pageSize, buildQueryParams(), { append })
    hasLoadedOnce.value = true
    pagination.value.page = page
  } catch (error) {
    message.error(t('files.messages.loadFilesFailed'))
  } finally {
    activeAction.value = ''
  }
}

const handleSearch = () => {
  if (filesStore.loading || deleting.value) return
  activeAction.value = 'search'
  pagination.value.page = 1
  loadFiles()
}

const handleRefresh = () => {
  if (filesStore.loading || deleting.value) return
  activeAction.value = 'refresh'
  if (viewMode.value === 'card') {
    pagination.value.page = 1
  }
  loadFiles()
}

const changePage = (page) => {
  if (deleting.value) return
  pagination.value.page = page
  loadFiles()
}

const changePageSize = (pageSize) => {
  if (deleting.value) return
  const nextSize = Number(pageSize)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  pagination.value.pageSize = nextSize
  pagination.value.page = 1
  loadFiles()
}

const loadMore = async () => {
  if (filesStore.loading || deleting.value) return
  if (!hasMore.value) return

  activeAction.value = 'loadMore'
  const nextPage = pagination.value.page + 1
  await loadFiles({ page: nextPage, append: true })
}

const openDeleteModal = (fileId) => {
  const id = String(fileId ?? '').trim()
  if (!id) return
  if (deleting.value) return

  pendingDeleteId.value = id
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  pendingDeleteId.value = ''
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

const handleDeleteConfirm = async () => {
  if (deleting.value) return

  const fileId = pendingDeleteId.value
  if (!fileId) return

  deleting.value = true

  try {
    await api.deleteFile(fileId)
    message.success(t('files.messages.deleteSuccess'))

    closeDeleteModal()

    if (viewMode.value === 'card') {
      pagination.value.page = 1
      await loadFiles({ page: 1 })
    } else {
      if (filesStore.files.length <= 1 && pagination.value.page > 1) {
        pagination.value.page -= 1
      }
      await loadFiles()
    }
  } catch (error) {
    message.error(t('files.messages.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

const handleDelete = (fileId) => {
  openDeleteModal(fileId)
}

const handleUploaded = () => {
  if (viewMode.value === 'card') {
    pagination.value.page = 1
  }
  loadFiles()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(viewModeKey)
    if (stored === 'table' || stored === 'card') {
      viewMode.value = stored
    }
  }

  loadFiles()
  loadUsers()
})

watch(viewMode, (value) => {
  if (typeof window === 'undefined') {
    return
  }
  if (value !== 'table' && value !== 'card') {
    return
  }
  window.localStorage.setItem(viewModeKey, value)
})
</script>

<style scoped>
.files-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.files-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.files-title-group {
  min-width: 0;
}

.files-title-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.files-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.files-upload-btn {
  padding: 0 10px;
  height: 32px;
}

.files-upload-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.files-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.files-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.filter-item.filename {
  width: 160px;
}

.filter-item.owner {
  width: 140px;
}

.filter-item.status {
  width: 120px;
}

.filter-item.created-range {
  width: 280px;
}

.filter-item.view-mode {
  display: flex;
  align-items: center;
}

.view-mode-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: var(--nb-border);
  border-radius: var(--nb-radius-md, var(--nb-radius));
  background: var(--nb-surface);
  height: 36px;
  align-items: center;
}

:root[data-ui-theme='shadcn'] .view-mode-toggle {
  border: 1px solid var(--border);
  background: var(--background);
}

.view-mode-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.view-mode-btn.is-active {
  background: var(--nb-secondary);
  border-color: var(--nb-border-color);
}

:root[data-ui-theme='shadcn'] .view-mode-btn.is-active {
  background: var(--accent);
}

.files-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.files-delete-confirm {
  margin: 0;
  color: var(--nb-muted-foreground, var(--nb-gray-600));
}

@media (max-width: 720px) {
  .files-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .files-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .filter-row {
    justify-content: flex-start;
  }

  .filter-item.filename,
  .filter-item.owner,
  .filter-item.status,
  .filter-item.created-range {
    width: 100%;
  }
}
</style>
