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
          </div>

          <Button type="primary" size="small" :disabled="loading" @click="openCreate">
            <Plus :size="16" style="margin-right: 6px" />
            {{ t('texts.createText') }}
          </Button>
        </div>
      </header>

      <section class="texts-content">
        <Card class="texts-table-card">
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
      </section>

      <Modal v-model:show="createModalVisible" :title="t('texts.modals.createTitle')" width="720px">
        <FormItem :label="t('texts.form.title')">
          <Input
            v-model="createForm.title"
            :placeholder="t('texts.form.titlePlaceholder')"
            clearable
          />
        </FormItem>

        <FormItem :label="t('texts.form.content')">
          <Input
            v-model="createForm.content"
            type="textarea"
            :rows="12"
            :placeholder="t('texts.form.contentPlaceholder')"
          />
        </FormItem>

        <template #footer>
          <Button type="default" :disabled="creating" @click="createModalVisible = false">
            {{ t('common.cancel') }}
          </Button>
          <Button type="primary" :loading="creating" @click="handleCreate">
            {{ t('common.create') }}
          </Button>
        </template>
      </Modal>

      <Modal v-model:show="editModalVisible" :title="t('texts.modals.editTitle')" width="720px">
        <template v-if="editLoading">
          <div class="modal-state">{{ t('texts.state.loading') }}</div>
        </template>

        <template v-else>
          <FormItem :label="t('texts.form.title')">
            <Input
              v-model="editForm.title"
              :placeholder="t('texts.form.titlePlaceholder')"
              clearable
            />
          </FormItem>

          <FormItem :label="t('texts.form.content')">
            <Input
              v-model="editForm.content"
              type="textarea"
              :rows="12"
              :placeholder="t('texts.form.contentPlaceholder')"
            />
          </FormItem>
        </template>

        <template #footer>
          <Button type="default" :disabled="updating" @click="editModalVisible = false">
            {{ t('common.cancel') }}
          </Button>
          <Button type="primary" :loading="updating" :disabled="editLoading" @click="handleUpdate">
            {{ t('common.submit') }}
          </Button>
        </template>
      </Modal>

      <Modal v-model:show="viewModalVisible" :title="t('texts.modals.viewTitle')" width="720px">
        <template v-if="viewLoading">
          <div class="modal-state">{{ t('texts.state.loading') }}</div>
        </template>

        <template v-else>
          <Descriptions :items="viewInfoItems" :column="1" />
          <Divider />
          <Input v-model="viewContent" type="textarea" :rows="14" readonly />
        </template>

        <template #footer>
          <Button type="default" @click="viewModalVisible = false">{{ t('common.close') }}</Button>
        </template>
      </Modal>

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
import { Info, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from '../components/ui/card/Card.vue'
import Button from '../components/ui/button/Button.vue'
import Table from '../components/ui/table/Table.vue'
import Modal from '../components/ui/modal/Modal.vue'
import FormItem from '../components/ui/form-item/FormItem.vue'
import Input from '../components/ui/input/Input.vue'
import Select from '../components/ui/select/Select.vue'
import Pagination from '../components/ui/pagination/Pagination.vue'
import Tooltip from '../components/ui/tooltip/Tooltip.vue'
import Descriptions from '../components/ui/descriptions/Descriptions.vue'
import Divider from '../components/ui/divider/Divider.vue'
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
            () => [h(Info, { size: 16, style: 'margin-right: 4px' }), t('texts.actions.view')]
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

const loadTexts = async () => {
  loading.value = true
  try {
    const result = await api.getTexts(
      pagination.value.page,
      pagination.value.pageSize,
      buildQueryParams()
    )
    texts.value = result.texts || []
    pagination.value.itemCount = Number(result.total || 0)
    pagination.value.page = Number(result.page || pagination.value.page)
    pagination.value.pageSize = Number(result.limit || pagination.value.pageSize)
  } catch (error) {
    message.error(t('texts.messages.loadFailed'))
  } finally {
    loading.value = false
    activeAction.value = ''
  }
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
const creating = ref(false)
const createForm = ref({ title: '', content: '' })

const resetCreateForm = () => {
  createForm.value = { title: '', content: '' }
}

const openCreate = () => {
  resetCreateForm()
  createModalVisible.value = true
}

const handleCreate = async () => {
  if (creating.value) return
  const content = String(createForm.value.content ?? '').trim()
  if (!content) {
    message.error(t('texts.validation.contentRequired'))
    return
  }

  creating.value = true
  try {
    await api.createText({ title: String(createForm.value.title ?? ''), content })
    message.success(t('texts.messages.createSuccess'))
    createModalVisible.value = false
    pagination.value.page = 1
    await loadTexts()
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.createFailed'))
  } finally {
    creating.value = false
  }
}

const editModalVisible = ref(false)
const editLoading = ref(false)
const updating = ref(false)
const editingId = ref('')
const editForm = ref({ title: '', content: '' })

const resetEdit = () => {
  editingId.value = ''
  editForm.value = { title: '', content: '' }
  editLoading.value = false
  updating.value = false
}

watch(editModalVisible, (visible) => {
  if (!visible) {
    resetEdit()
  }
})

const openEdit = async (row) => {
  const id = normalizeId(row?.id)
  if (!id) return

  editingId.value = id
  editModalVisible.value = true
  editLoading.value = true

  try {
    const result = await api.getText(id)
    const text = result?.text || {}
    editForm.value = {
      title: String(text.title ?? ''),
      content: String(text.content ?? ''),
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.openFailed'))
    editModalVisible.value = false
  } finally {
    editLoading.value = false
  }
}

const handleUpdate = async () => {
  if (updating.value || editLoading.value) return

  const id = editingId.value
  if (!id) return

  const content = String(editForm.value.content ?? '').trim()
  if (!content) {
    message.error(t('texts.validation.contentRequired'))
    return
  }

  updating.value = true
  try {
    await api.updateText(id, {
      title: String(editForm.value.title ?? ''),
      content,
    })
    message.success(t('texts.messages.updateSuccess'))
    editModalVisible.value = false
    await loadTexts()
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.updateFailed'))
  } finally {
    updating.value = false
  }
}

const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewText = ref(null)
const viewContent = ref('')

const resetView = () => {
  viewText.value = null
  viewContent.value = ''
  viewLoading.value = false
}

watch(viewModalVisible, (visible) => {
  if (!visible) {
    resetView()
  }
})

const viewInfoItems = computed(() => {
  const text = viewText.value
  if (!text) return []

  const title = String(text.title ?? '').trim() || '-'
  const owner = String(text.owner_username || text.owner_id || '-').trim() || '-'
  const createdAt = formatDateTime(text.created_at)
  const updatedAt = formatDateTime(text.updated_at)

  const items = [
    { label: t('texts.columns.title'), value: title },
    { label: t('texts.columns.length'), value: formatBytes(viewContent.value.length) },
  ]

  if (authStore.isAdmin) {
    items.push({ label: t('texts.columns.owner'), value: owner })
  }

  items.push(
    { label: t('texts.columns.createdAt'), value: createdAt },
    { label: t('texts.columns.updatedAt'), value: updatedAt }
  )

  return items
})

const openView = async (row) => {
  const id = normalizeId(row?.id)
  if (!id) return

  viewModalVisible.value = true
  viewLoading.value = true

  try {
    const result = await api.getText(id)
    viewText.value = result?.text || null
    viewContent.value = String(result?.text?.content ?? '')
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.openFailed'))
    viewModalVisible.value = false
  } finally {
    viewLoading.value = false
  }
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

    if (texts.value.length <= 1 && pagination.value.page > 1) {
      pagination.value.page -= 1
    }

    await loadTexts()
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
  loadTexts()
  loadUsers()
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

.texts-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.modal-state {
  padding: var(--nb-space-md);
  text-align: center;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.texts-confirm-text {
  margin: 0;
  color: var(--nb-ink);
}

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
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
}
</style>
