<template>
  <AppLayout>
    <div class="texts-page">
      <header class="texts-header">
        <div class="texts-title-group">
          <div class="texts-title-row">
            <h1 class="texts-title">{{ t('texts.title') }}</h1>
          </div>
          <p class="texts-subtitle">
            {{ t('texts.subtitle') }}
          </p>
        </div>

        <div class="texts-actions">
          <div class="filter-row">
            <div class="filter-item query">
              <Input
                v-model="filters.q"
                :placeholder="t('texts.filters.q')"
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

            <Button
              type="default"
              size="small"
              :loading="loading && activeAction === 'search'"
              :disabled="loading"
              @click="handleSearch"
            >
              <Search :size="16" style="margin-right: 6px" />
              {{ t('common.search') }}
            </Button>

            <Button
              type="default"
              size="small"
              :loading="loading && activeAction === 'refresh'"
              :disabled="loading"
              @click="handleRefresh"
            >
              <RefreshCw :size="16" style="margin-right: 6px" />
              {{ t('common.refresh') }}
            </Button>

            <div class="filter-item view-mode">
              <div class="view-mode-toggle" role="group" aria-label="View mode">
                <Tooltip :content="t('texts.viewMode.table')">
                  <Button
                    type="ghost"
                    size="small"
                    class="view-mode-btn"
                    :class="{ 'is-active': viewMode === 'table' }"
                    :disabled="loading"
                    :aria-label="t('texts.viewMode.table')"
                    @click="setViewMode('table')"
                  >
                    <Table2 :size="18" />
                  </Button>
                </Tooltip>
                <Tooltip :content="t('texts.viewMode.card')">
                  <Button
                    type="ghost"
                    size="small"
                    class="view-mode-btn"
                    :class="{ 'is-active': viewMode === 'card' }"
                    :disabled="loading"
                    :aria-label="t('texts.viewMode.card')"
                    @click="setViewMode('card')"
                  >
                    <LayoutGrid :size="18" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>

          <Button type="primary" size="small" :disabled="loading" @click="openCreate">
            <Plus :size="16" style="margin-right: 6px" />
            {{ t('texts.createText') }}
          </Button>
        </div>
      </header>

      <section class="texts-content">
        <Card v-if="viewMode === 'table'" class="texts-table-card">
          <Table class="texts-table" :columns="columns" :data="texts" :loading="loading" />

          <Pagination
            v-if="pagination.itemCount > 0"
            :page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.itemCount"
            :disabled="loading"
            @update:page="changePage"
            @update:page-size="changePageSize"
          />
        </Card>

        <template v-else>
          <div v-if="loading && texts.length === 0" class="texts-state">
            {{ t('texts.state.loading') }}
          </div>
          <div v-else-if="texts.length === 0" class="texts-state">
            {{ t('texts.state.empty') }}
          </div>
          <div v-else class="texts-cards-section">
            <div class="texts-cards">
              <Card
                v-for="row in texts"
                :key="row.id"
                header-bg="var(--nb-surface)"
                header-color="var(--nb-ink)"
                class="text-card"
                @click="openView(row)"
              >
                <template #header>
                  <div class="text-card-header">
                    <span class="text-card-icon">
                      <FileText :size="18" />
                    </span>
                    <Tag type="info" size="small">{{ detectFileType(row) }}</Tag>
                  </div>
                </template>

                <template #header-extra>
                  <div class="text-card-actions">
                    <Tooltip :content="t('texts.actions.edit')">
                      <Button
                        type="ghost"
                        size="small"
                        class="icon-btn"
                        :disabled="loading || deleting"
                        @click.stop="openEdit(row)"
                      >
                        <Pencil :size="18" />
                      </Button>
                    </Tooltip>
                    <Tooltip :content="t('texts.actions.delete')">
                      <Button
                        type="ghost"
                        size="small"
                        class="icon-btn icon-danger"
                        :disabled="loading || deleting || deletingId === normalizeId(row?.id)"
                        :loading="deletingId === normalizeId(row?.id)"
                        @click.stop="handleDelete(row)"
                      >
                        <Trash2 :size="18" />
                      </Button>
                    </Tooltip>
                  </div>
                </template>

                <div class="text-card-body">
                  <div class="text-card-preview">{{ buildPreview(row) }}</div>
                </div>

                <template #footer>
                  <div class="text-card-footer">
                    <span class="text-card-size">{{ formatBytes(row?.content_length ?? 0) }}</span>
                    <span class="text-card-time">{{ formatDateTime(row?.updated_at) }}</span>
                  </div>
                </template>
              </Card>
            </div>

            <div v-if="hasMore" class="texts-load-more">
              <Button
                type="default"
                size="small"
                class="load-more-btn"
                :loading="loading && activeAction === 'loadMore'"
                :disabled="loading"
                @click="loadMore"
              >
                {{ t('texts.actions.loadMore') }}
              </Button>
            </div>
          </div>
        </template>
      </section>

      <TextFormModal
        v-model:show="createModalVisible"
        mode="create"
        @success="handleFormSuccess"
      />

      <TextFormModal
        v-model:show="editModalVisible"
        mode="edit"
        :text-id="editingId"
        @success="handleFormSuccess"
      />

      <TextViewModal v-model:show="viewModalVisible" :text-id="viewingId" />

      <Modal
        :show="showDeleteModal"
        :title="t('texts.modals.deleteTitle')"
        width="420px"
        @update:show="handleDeleteModalUpdate"
      >
        <p class="texts-confirm-text">
          {{ deleteConfirmText }}
        </p>

        <template #footer>
          <Button type="default" :disabled="deleting" @click="handleDeleteCancel">{{
            t('common.cancel')
          }}</Button>
          <Button type="danger" :loading="deleting" @click="handleDeleteConfirm">{{
            t('texts.actions.delete')
          }}</Button>
        </template>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { Eye, FileText, LayoutGrid, Pencil, Plus, RefreshCw, Search, Table2, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from '../components/ui/card/Card.vue'
import Button from '../components/ui/button/Button.vue'
import Table from '../components/ui/table/Table.vue'
import Modal from '../components/ui/modal/Modal.vue'
import Input from '../components/ui/input/Input.vue'
import Select from '../components/ui/select/Select.vue'
import Pagination from '../components/ui/pagination/Pagination.vue'
import Tag from '../components/ui/tag/Tag.vue'
import Tooltip from '../components/ui/tooltip/Tooltip.vue'
import TextFormModal from '../components/texts/TextFormModal.vue'
import TextViewModal from '../components/texts/TextViewModal.vue'
import { useMessage } from '../composables/useMessage'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const message = useMessage()
const { t, locale } = useI18n({ useScope: 'global' })

const texts = ref([])
const loading = ref(false)
const activeAction = ref('')
const deletingId = ref('')

const showDeleteModal = ref(false)
const deleting = ref(false)
const pendingDeleteId = ref('')

const deleteConfirmText = computed(() => t('texts.confirmDelete'))

const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })

const filters = ref({ q: '', owner_id: '' })

const viewModeKey = 'flares3:texts-view-mode'
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
  { label: t('texts.filters.allOwners'), value: '' },
  ...users.value.map((u) => ({ label: u.username, value: u.id })),
])

const normalizeId = (value) => String(value ?? '').trim()

const formatDateTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale.value)
}

const formatBytes = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '-'
  if (value === 0) return '0 B'

  const unit = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(unit)))
  const size = Math.round((value / Math.pow(unit, index)) * 100) / 100
  return `${size} ${units[index]}`
}

const buildPreview = (row) => {
  const preview = String(row?.content_preview ?? '')
  const contentLength = Number(row?.content_length ?? preview.length)
  const suffix = contentLength > preview.length ? '…' : ''
  return preview ? `${preview}${suffix}` : '-'
}

const isLikelyMarkdown = (text) => {
  const content = String(text ?? '')
  if (!content.trim()) return false

  let score = 0

  if (/```|~~~/.test(content)) score += 3
  if (/\[[^\]]+\]\([^)]+\)/.test(content)) score += 2
  if (/(\*\*|__)[^\s].+?(\*\*|__)/.test(content)) score += 1

  const lines = content.split(/\r?\n/)
  if (lines.some((line) => /^#{1,6}\s+\S/.test(line))) score += 2
  if (lines.some((line) => /^\s*>\s+\S/.test(line))) score += 1
  if (lines.some((line) => /^\s*([-*+]|\d+\.)\s+\S/.test(line))) score += 1

  return score >= 2
}

const detectFileType = (row) => {
  const preview = String(row?.content_preview ?? '')
  return isLikelyMarkdown(preview) ? 'MD' : 'TEXT'
}

const hasMore = computed(() => texts.value.length < pagination.value.itemCount)

const columns = computed(() => {
  const base = [
    {
      title: t('texts.columns.title'),
      key: 'title',
      align: 'left',
      width: 160,
      render: (row) => {
        const value = String(row?.title ?? '').trim()
        return h(Tooltip, { content: value }, () => (value ? value : '-'))
      },
    },
    {
      title: t('texts.columns.preview'),
      key: 'content_preview',
      align: 'center',
      ellipsis: true,
      render: (row) => {
        const preview = buildPreview(row)
        const tooltip = preview === '-' ? '' : preview
        return h(Tooltip, { content: tooltip }, () => preview)
      },
    },
    {
      title: t('texts.columns.length'),
      key: 'content_length',
      width: 100,
      align: 'center',
      ellipsis: false,
      render: (row) => {
        const length = Number(row?.content_length ?? 0)
        if (!Number.isFinite(length) || length < 0) return h('span', '-')
        return h('span', formatBytes(length))
      },
    },
    {
      title: t('texts.columns.updatedAt'),
      key: 'updated_at',
      width: themeStore.uiTheme === 'shadcn' ? 190 : 220,
      align: 'center',
      ellipsis: false,
      render: (row) => h('span', formatDateTime(row?.updated_at)),
    },
    {
      title: t('texts.columns.actions'),
      key: 'actions',
      width: themeStore.uiTheme === 'shadcn' ? 280 : 350,
      align: 'center',
      ellipsis: false,
      render: (row) => {
        const id = normalizeId(row?.id)
        const disabled = loading.value || deleting.value || !id
        const isDeleting = deletingId.value === id

        return h('div', { class: 'action-buttons' }, [
          h(
            Button,
            { size: 'small', type: 'default', disabled, onClick: () => openView(row) },
            () => [h(Eye, { size: 16, style: 'margin-right: 4px' }), t('texts.actions.view')]
          ),
          h(
            Button,
            { size: 'small', type: 'default', disabled, onClick: () => openEdit(row) },
            () => [h(Pencil, { size: 16, style: 'margin-right: 4px' }), t('texts.actions.edit')]
          ),
          h(
            Button,
            {
              size: 'small',
              type: 'danger',
              disabled: disabled || isDeleting,
              loading: isDeleting,
              onClick: () => handleDelete(row),
            },
            () => [h(Trash2, { size: 16, style: 'margin-right: 4px' }), t('texts.actions.delete')]
          ),
        ])
      },
    },
  ]

  if (authStore.isAdmin) {
    base.splice(4, 0, {
      title: t('texts.columns.owner'),
      key: 'owner',
      width: 140,
      align: 'center',
      ellipsis: false,
      render: (row) => h('span', String(row?.owner_username || row?.owner_id || '-')),
    })
  }

  return base
})

const buildQueryParams = () => {
  const params = {}
  const q = String(filters.value.q ?? '').trim()
  if (q) params.q = q

  if (authStore.isAdmin) {
    const ownerId = String(filters.value.owner_id ?? '').trim()
    if (ownerId) params.owner_id = ownerId
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
    message.error(t('texts.messages.loadUsersFailed'))
  } finally {
    usersLoading.value = false
  }
}

const loadTexts = async ({ page = pagination.value.page, append = false } = {}) => {
  loading.value = true
  try {
    const result = await api.getTexts(page, pagination.value.pageSize, buildQueryParams())
    const nextTexts = result.texts || []
    texts.value = append ? [...texts.value, ...nextTexts] : nextTexts
    pagination.value.itemCount = Number(result.total || 0)
    pagination.value.page = Number(result.page || page)
    pagination.value.pageSize = Number(result.limit || pagination.value.pageSize)
  } catch (error) {
    message.error(t('texts.messages.loadFailed'))
  } finally {
    loading.value = false
    activeAction.value = ''
  }
}

const loadMore = async () => {
  if (loading.value) return
  if (!hasMore.value) return

  activeAction.value = 'loadMore'
  const nextPage = pagination.value.page + 1
  await loadTexts({ page: nextPage, append: true })
}

const handleSearch = () => {
  if (loading.value) return
  activeAction.value = 'search'
  pagination.value.page = 1
  loadTexts()
}

const handleRefresh = () => {
  if (loading.value) return
  activeAction.value = 'refresh'
  if (viewMode.value === 'card') {
    pagination.value.page = 1
  }
  loadTexts()
}

const changePage = (page) => {
  pagination.value.page = page
  loadTexts()
}

const changePageSize = (pageSize) => {
  const nextSize = Number(pageSize)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  pagination.value.pageSize = nextSize
  pagination.value.page = 1
  loadTexts()
}

const createModalVisible = ref(false)
const editModalVisible = ref(false)
const editingId = ref('')

const openCreate = () => {
  createModalVisible.value = true
}

const openEdit = async (row) => {
  const id = normalizeId(row?.id)
  if (!id) return
  editingId.value = id
  editModalVisible.value = true
}

const handleFormSuccess = async () => {
  pagination.value.page = 1
  await loadTexts()
}

const viewModalVisible = ref(false)
const viewingId = ref('')

const openView = async (row) => {
  const id = normalizeId(row?.id)
  if (!id) return
  viewingId.value = id
  viewModalVisible.value = true
}

const openDeleteModal = (row) => {
  const id = normalizeId(row?.id)
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

  const id = pendingDeleteId.value
  if (!id) return

  deleting.value = true
  deletingId.value = id

  try {
    await api.deleteText(id)
    message.success(t('texts.messages.deleteSuccess'))

    closeDeleteModal()

    if (viewMode.value === 'card') {
      pagination.value.page = 1
      await loadTexts()
    } else {
      if (texts.value.length <= 1 && pagination.value.page > 1) {
        pagination.value.page -= 1
      }
      await loadTexts()
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.deleteFailed'))
  } finally {
    deleting.value = false
    deletingId.value = ''
  }
}

const handleDelete = (row) => {
  openDeleteModal(row)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(viewModeKey)
    if (stored === 'table' || stored === 'card') {
      viewMode.value = stored
    }
  }
  loadTexts()
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
.texts-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.texts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.texts-title-group {
  min-width: 0;
}

.texts-title-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.texts-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.texts-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.texts-actions {
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

.filter-item.query {
  width: 180px;
}

.filter-item.owner {
  width: 160px;
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

.texts-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.texts-state {
  padding: var(--nb-space-md);
  text-align: center;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.texts-confirm-text {
  margin: 0;
  color: var(--nb-ink);
}

:deep(.texts-table .brutal-table),
:deep(.texts-table .shadcn-table) {
  table-layout: fixed;
}

:deep(.texts-table .brutal-table th),
:deep(.texts-table .brutal-table td),
:deep(.texts-table .shadcn-table th),
:deep(.texts-table .shadcn-table td) {
  white-space: nowrap;
}

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.texts-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--nb-space-lg);
}

.text-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.text-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.texts-cards-section {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.texts-load-more {
  display: flex;
  justify-content: center;
  padding: var(--nb-space-md) 0;
  width: 100%;
}

.load-more-btn {
  min-width: 120px;
}

.text-card-header {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  min-width: 0;
}

.text-card-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--nb-radius-md, var(--nb-radius));
  background: var(--nb-secondary);
  border: var(--nb-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--nb-ink);
  flex-shrink: 0;
}

:root[data-ui-theme='shadcn'] .text-card-icon {
  background: var(--nb-gray-50);
}

.text-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.text-card:hover .text-card-actions {
  opacity: 1;
}

.icon-btn {
  width: 36px;
  padding: 0;
}

.icon-danger {
  color: var(--destructive, var(--nb-danger));
}

.text-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 120px;
  padding: var(--nb-space-sm);
  border-radius: var(--nb-radius);
  background: var(--nb-gray-100);
}

.text-card-preview {
  color: var(--nb-ink);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
  width: 100%;
}

.text-card-size {
  flex-shrink: 0;
}

.text-card-time {
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .texts-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .texts-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .filter-row {
    justify-content: flex-start;
  }

  .filter-item.query,
  .filter-item.owner {
    width: 100%;
  }

  .texts-cards {
    grid-template-columns: 1fr;
  }
}
</style>
