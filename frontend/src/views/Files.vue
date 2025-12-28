<template>
  <AppLayout>
    <div class="files-page">
      <header class="files-header">
        <div class="files-title-group">
          <h1 class="files-title">文件列表</h1>
          <p class="files-subtitle">
            查看和管理所有上传的文件
          </p>
        </div>

        <div class="files-actions">
          <div class="filter-row">
            <div class="filter-item filename">
              <Input v-model="filters.filename" placeholder="文件名称" size="small" @keyup.enter="handleSearch" />
            </div>

            <div v-if="authStore.isAdmin" class="filter-item owner">
              <Select v-model="filters.owner_id" :options="ownerOptions" :disabled="usersLoading" />
            </div>

            <div class="filter-item status">
              <Select v-model="filters.upload_status" :options="statusOptions" />
            </div>

            <div class="filter-item created-date">
              <Input v-model="filters.created_date" type="date" size="small" placeholder="上传时间" />
            </div>

            <Button
              type="default"
              size="small"
              :loading="filesStore.loading && activeAction === 'search'"
              :disabled="filesStore.loading"
              @click="handleSearch"
            >
              <Search :size="16" style="margin-right: 6px" />
              搜索
            </Button>
            <Button
              type="default"
              size="small"
              :loading="filesStore.loading && activeAction === 'refresh'"
              :disabled="filesStore.loading"
              @click="handleRefresh"
            >
              <RefreshCw :size="16" style="margin-right: 6px" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      <section class="files-content">
        <Card class="files-table-card">
          <Table class="files-table" :columns="columns" :data="filesStore.files" :loading="tableLoading" />

          <div v-if="filesStore.total > 0" class="pagination">
            <span>共 {{ filesStore.total }} 条</span>
            <div class="page-btns">
              <Button
                size="small"
                type="ghost"
                :disabled="filesStore.loading || pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >上一页</Button>
              <span class="page-info">{{ pagination.page }}</span>
              <Button
                size="small"
                type="ghost"
                :disabled="filesStore.loading || pagination.page * pagination.pageSize >= filesStore.total"
                @click="changePage(pagination.page + 1)"
              >下一页</Button>
            </div>
          </div>
        </Card>
      </section>

      <Modal v-model:show="showInfoModal" title="文件信息" width="500px">
        <template v-if="selectedFile">
          <Descriptions
            :items="[
              { label: '文件名', value: selectedFile.filename },
              { label: '文件大小', value: formatBytes(selectedFile.size) },
              { label: '上传时间', value: new Date(selectedFile.created_at).toLocaleString('zh-CN') },
              { label: '剩余时间', value: selectedFile.remaining_time },
              { label: '下载权限', value: selectedFile.require_login ? '需要登录' : '公开' }
            ]"
            :column="1"
          />

          <Divider />

          <div class="link-group">
            <label class="link-label">短链接</label>
            <div class="link-row">
              <Input :model-value="getShortUrl(selectedFile)" readonly size="small" />
              <Button type="primary" size="small" @click="copyUrl(getShortUrl(selectedFile), '短链接')">复制</Button>
            </div>
          </div>

          <div class="link-group">
            <label class="link-label">直链</label>
            <div class="link-row">
              <Input :model-value="getDownloadUrl(selectedFile)" readonly size="small" />
              <Button type="default" size="small" @click="copyUrl(getDownloadUrl(selectedFile), '直链')">复制</Button>
            </div>
          </div>
        </template>

        <template #footer>
          <Button type="default" @click="showInfoModal = false">关闭</Button>
          <Button type="primary" @click="handleDownload(selectedFile)">下载文件</Button>
        </template>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted, computed } from 'vue'
import { Info, Trash2, RefreshCw, Search } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useFilesStore } from '../stores/files'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from '../components/ui/card/Card.vue'
import Button from '../components/ui/button/Button.vue'
import Select from '../components/ui/select/Select.vue'
import Table from '../components/ui/table/Table.vue'
import Modal from '../components/ui/modal/Modal.vue'
import Descriptions from '../components/ui/descriptions/Descriptions.vue'
import Divider from '../components/ui/divider/Divider.vue'
import Input from '../components/ui/input/Input.vue'
import Tag from '../components/ui/tag/Tag.vue'
import Tooltip from "../components/ui/tooltip/Tooltip.vue"
import { useMessage } from '../composables/useMessage'

const authStore = useAuthStore()
const filesStore = useFilesStore()
const message = useMessage()

const showInfoModal = ref(false)
const selectedFile = ref(null)

const filters = ref({
  filename: '',
  owner_id: '',
  upload_status: '',
  created_date: ''
})

const usersLoading = ref(false)
const users = ref([])
const ownerOptions = computed(() => [
  { label: '全部用户', value: '' },
  ...users.value.map((u) => ({ label: u.username, value: u.id }))
])

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '有效', value: 'completed' },
  { label: '失效', value: 'deleted' }
]

const activeAction = ref('')
const hasLoadedOnce = ref(false)
const tableLoading = computed(() => filesStore.loading && !hasLoadedOnce.value)

const pagination = ref({ page: 1, pageSize: 20 })

const columns = computed(() => [
  {
    title: '文件名',
    key: 'filename',
    align: 'left',
    render: (row) => h(Tooltip, { content: row.filename }, () => row.filename)
  },
  {
    title: '大小',
    key: 'size',
    width: 100,
    align: 'center',
    render: (row) => {
      const sizeText = formatBytes(row.size)
      return h(Tooltip, { content: sizeText }, () => sizeText)
    }
  },
  {
    title: '有效期',
    key: 'expires_in',
    width: 80,
    align: 'center',
    render: (row) => {
      const text = row.expires_in === -30 ? '30秒' : row.expires_in + '天'
      return h(Tooltip, { content: text }, () => text)
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    align: 'center',
    render: (row) => {
      const statusText = row.upload_status === 'deleted' ? '失效' : '有效'
      return h(Tooltip, { content: statusText }, () =>
        h(Tag, {
          type: row.upload_status === 'deleted' ? 'danger' : 'success',
          size: 'small'
        }, () => statusText)
      )
    }
  },
  {
    title: '剩余时间',
    key: 'remaining_time',
    width: 160,
    align: 'center',
    render: (row) => {
      const text = row.upload_status === 'deleted' ? '-' : row.remaining_time
      return h(Tooltip, { content: text }, () => text)
    }
  },
  {
    title: '上传时间',
    key: 'created_at',
    width: 160,
    align: 'center',
    render: (row) => {
      const text = new Date(row.created_at).toLocaleString('zh-CN')
      return h(Tooltip, { content: text }, () => text)
    }
  },
  ...(authStore.isAdmin ? [{
    title: '归属用户',
    key: 'owner',
    width: 120,
    align: 'center',
    render: (row) => {
      const text = row.owner_username || row.owner_id
      return h(Tooltip, { content: text }, () => text)
    }
  }] : []),
  {
    title: '操作', key: 'actions', width: 200, align: 'center', ellipsis: false,
    render: (row) => {
      const isDeleted = row.upload_status === 'deleted'
      return h('div', { class: 'action-buttons' }, [
        h(Button, {
          size: 'small',
          type: 'default',
          disabled: isDeleted,
          onClick: () => showFileInfo(row)
        }, () => [
          h(Info, { size: 16, style: 'margin-right: 4px' }),
          '详情'
        ]),
        h(Button, {
          size: 'small',
          type: 'danger',
          disabled: isDeleted,
          onClick: () => handleDelete(row.id)
        }, () => [
          h(Trash2, { size: 16, style: 'margin-right: 4px' }),
          '删除'
        ])
      ])
    }
  }
])

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getShortUrl = (file) => window.location.origin + '/s/' + file.short_code
const getDownloadUrl = (file) => file.download_url || (window.location.origin + `/api/files/${file.id}/download`)

const copyUrl = (url, type) => {
  navigator.clipboard.writeText(url)
  message.success(`${type}已复制到剪贴板`)
}

const showFileInfo = (row) => {
  selectedFile.value = row
  showInfoModal.value = true
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

  if (filters.value.created_date) {
    const createdFrom = toIsoStartOfDay(filters.value.created_date)
    const createdTo = createdFrom ? addOneDayIso(createdFrom) : null
    if (createdFrom && createdTo) {
      params.created_from = createdFrom
      params.created_to = createdTo
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
    message.error('加载用户列表失败')
  } finally {
    usersLoading.value = false
  }
}

const loadFiles = async () => {
  try {
    await filesStore.fetchFiles(pagination.value.page, pagination.value.pageSize, buildQueryParams())
    hasLoadedOnce.value = true
  } catch (error) {
    message.error('加载文件列表失败')
  } finally {
    activeAction.value = ''
  }
}

const handleSearch = () => {
  if (filesStore.loading) return
  activeAction.value = 'search'
  pagination.value.page = 1
  loadFiles()
}

const handleRefresh = () => {
  if (filesStore.loading) return
  activeAction.value = 'refresh'
  loadFiles()
}

const changePage = (page) => {
  pagination.value.page = page
  loadFiles()
}

const handleDownload = (row) => {
  window.open(getDownloadUrl(row), '_blank')
}

const handleDelete = async (fileId) => {
  if (!confirm('确定要删除这个文件吗？')) return
  try {
    await filesStore.deleteFile(fileId)
    message.success('文件已删除')
  } catch (error) {
    message.error('删除文件失败')
  }
}

onMounted(() => {
  loadFiles()
  loadUsers()
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

.files-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
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

.filter-item.created-date {
  width: 160px;
}

.files-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

/* Table Card Styling */
.files-table-card {
  /* min-height removed to avoid empty space */
}

:deep(.files-table .brutal-table) {
  table-layout: fixed;
}

:deep(.files-table .brutal-table th),
:deep(.files-table .brutal-table td) {
  white-space: nowrap;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-top: var(--nb-border);
}

/* shadcn/ui theme adjustment */
:root[data-ui-theme="shadcn"] .pagination {
  background-color: var(--nb-gray-50);
}

.page-btns {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.page-info {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  padding: 0 var(--nb-space-sm);
}

:root[data-ui-theme="shadcn"] .page-info {
  font-weight: 600;
  min-width: 32px;
  text-align: center;
  padding: 4px 12px;
  background-color: var(--nb-surface);
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
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

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
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
}
</style>
