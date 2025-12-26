<template>
  <AppLayout>
    <BrutalCard title="文件列表">
      <template #header-extra>
        <div class="header-actions">
          <BrutalSelect
            v-if="authStore.isAdmin"
            v-model="scope"
            :options="scopeOptions"
            @update:model-value="handleScopeChange"
          />
          <BrutalButton type="default" size="small" @click="loadFiles">刷新</BrutalButton>
        </div>
      </template>

      <BrutalTable class="files-table" :columns="columns" :data="filesStore.files" :loading="filesStore.loading" />

      <div v-if="filesStore.total > 0" class="pagination">
        <span>共 {{ filesStore.total }} 条</span>
        <div class="page-btns">
          <BrutalButton
            size="small"
            type="ghost"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >上一页</BrutalButton>
          <span class="page-info">{{ pagination.page }}</span>
          <BrutalButton
            size="small"
            type="ghost"
            :disabled="pagination.page * pagination.pageSize >= filesStore.total"
            @click="changePage(pagination.page + 1)"
          >下一页</BrutalButton>
        </div>
      </div>
    </BrutalCard>

    <BrutalModal v-model:show="showInfoModal" title="文件信息" width="500px">
      <template v-if="selectedFile">
        <BrutalDescriptions
          :items="[
            { label: '文件名', value: selectedFile.filename },
            { label: '文件大小', value: formatBytes(selectedFile.size) },
            { label: '上传时间', value: new Date(selectedFile.created_at).toLocaleString('zh-CN') },
            { label: '剩余时间', value: selectedFile.remaining_time },
            { label: '下载权限', value: selectedFile.require_login ? '需要登录' : '公开' }
          ]"
          :column="1"
        />

        <BrutalDivider />

        <div class="link-group">
          <label class="link-label">短链接</label>
          <div class="link-row">
            <BrutalInput :model-value="getShortUrl(selectedFile)" readonly size="small" />
            <BrutalButton type="primary" size="small" @click="copyUrl(getShortUrl(selectedFile), '短链接')">复制</BrutalButton>
          </div>
        </div>

        <div class="link-group">
          <label class="link-label">直链</label>
          <div class="link-row">
            <BrutalInput :model-value="getDownloadUrl(selectedFile)" readonly size="small" />
            <BrutalButton type="default" size="small" @click="copyUrl(getDownloadUrl(selectedFile), '直链')">复制</BrutalButton>
          </div>
        </div>
      </template>

      <template #footer>
        <BrutalButton type="default" @click="showInfoModal = false">关闭</BrutalButton>
        <BrutalButton type="primary" @click="handleDownload(selectedFile)">下载文件</BrutalButton>
      </template>
    </BrutalModal>
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted, computed } from 'vue'
import { Info, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useFilesStore } from '../stores/files'
import AppLayout from '../components/layout/AppLayout.vue'
import BrutalCard from '../components/ui/BrutalCard.vue'
import BrutalButton from '../components/ui/BrutalButton.vue'
import BrutalSelect from '../components/ui/BrutalSelect.vue'
import BrutalTable from '../components/ui/BrutalTable.vue'
import BrutalModal from '../components/ui/BrutalModal.vue'
import BrutalDescriptions from '../components/ui/BrutalDescriptions.vue'
import BrutalDivider from '../components/ui/BrutalDivider.vue'
import BrutalInput from '../components/ui/BrutalInput.vue'
import BrutalTag from '../components/ui/BrutalTag.vue'
import Tooltip from '../components/ui/Tooltip.vue'
import { useMessage } from '../composables/useMessage'

const authStore = useAuthStore()
const filesStore = useFilesStore()
const message = useMessage()

const showInfoModal = ref(false)
const selectedFile = ref(null)
const scope = ref(authStore.isAdmin ? 'all' : 'mine')
const scopeOptions = [
  { label: '全部文件', value: 'all' },
  { label: '我的文件', value: 'mine' }
]

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
      const statusText = row.upload_status === 'deleted' ? '已过期' : '有效'
      return h(Tooltip, { content: statusText }, () =>
        h(BrutalTag, {
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
        h(BrutalButton, {
          size: 'small',
          type: 'default',
          disabled: isDeleted,
          onClick: () => showFileInfo(row)
        }, () => [
          h(Info, { size: 16, style: 'margin-right: 4px' }),
          '详情'
        ]),
        h(BrutalButton, {
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

const loadFiles = async () => {
  try {
    await filesStore.fetchFiles(pagination.value.page, pagination.value.pageSize, scope.value)
  } catch (error) {
    message.error('加载文件列表失败')
  }
}

const handleScopeChange = () => {
  pagination.value.page = 1
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

onMounted(() => loadFiles())
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
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
  margin-top: var(--nb-space-lg);
  padding-top: var(--nb-space-md);
  border-top: var(--nb-border-width) dashed var(--nb-border-color);
}

/* shadcn/ui theme: Modern pagination style */
:root[data-ui-theme="shadcn"] .pagination {
  border-top: var(--nb-border-width) solid var(--nb-border-color);
  background-color: var(--nb-gray-50);
  margin-top: 0;
  padding: var(--nb-space-md) var(--nb-space-lg);
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

/* shadcn/ui theme: Cleaner page info */
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

/* Action buttons styling */
:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

/* shadcn/ui theme: Compact action buttons */
:root[data-ui-theme="shadcn"] :deep(.action-buttons) {
  gap: 8px;
}
</style>
