<template>
  <AppLayout>
    <div class="audit-page">
      <header class="audit-header">
        <div class="audit-title-group">
          <h1 class="audit-title">{{ t('audit.title') }}</h1>
          <p class="audit-subtitle">
            {{ t('audit.subtitle') }}
          </p>
        </div>

        <div class="audit-actions">
          <div class="filter-row">
            <div class="filter-item action">
              <Select v-model="filters.action" :options="actionOptions" size="small" />
            </div>

            <div class="filter-item actor">
              <Select
                v-model="filters.actor_user_id"
                :options="actorOptions"
                size="small"
                :disabled="usersLoading"
              />
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

            <Button
              type="danger"
              size="small"
              :disabled="loading || deleting || selectedIds.length === 0"
              @click="handleBatchDelete"
            >
              <Trash2 :size="16" style="margin-right: 6px" />
              {{ t('audit.actions.deleteSelected', { count: selectedIds.length }) }}
            </Button>
          </div>
        </div>
      </header>

      <section class="audit-content">
        <Card class="audit-table-card">
          <Table class="audit-table" :columns="columns" :data="logs" :loading="loading" />

          <Pagination
            v-if="pagination.itemCount > 0"
            :page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.itemCount"
            @update:page="changePage"
            @update:page-size="changePageSize"
          />
        </Card>
      </section>

      <Modal
        :show="showDeleteModal"
        :title="t('audit.modals.deleteTitle')"
        width="420px"
        @update:show="handleDeleteModalUpdate"
      >
        <p class="audit-delete-confirm">
          {{ deleteConfirmText }}
        </p>

        <template #footer>
          <Button type="default" :disabled="deleting" @click="handleDeleteCancel">{{ t('common.cancel') }}</Button>
          <Button type="danger" :loading="deleting" @click="handleDeleteConfirm">{{ t('audit.actions.delete') }}</Button>
        </template>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, ref, h, onMounted } from 'vue'
import { RefreshCw, Search, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from "../components/ui/card/Card.vue"
import Button from "../components/ui/button/Button.vue"
import Select from "../components/ui/select/Select.vue"
import Table from "../components/ui/table/Table.vue"
import DateRangePicker from '../components/ui/date-range-picker/DateRangePicker.vue'
import Pagination from "../components/ui/pagination/Pagination.vue"
import Tag from "../components/ui/tag/Tag.vue"
import Tooltip from "../components/ui/tooltip/Tooltip.vue"
import Modal from "../components/ui/modal/Modal.vue"
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const { t, locale } = useI18n({ useScope: 'global' })
const logs = ref([])
const loading = ref(false)
const activeAction = ref('')
const filters = ref({ action: '', actor_user_id: '', created_from_date: '', created_to_date: '' })
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })

const selectedIds = ref([])
const deleting = ref(false)
const showDeleteModal = ref(false)
const pendingDeleteIds = ref([])

const users = ref([])
const usersLoading = ref(false)

const knownActions = [
  'BOOTSTRAP_ADMIN',
  'FILE_DELETE',
  'FILE_DOWNLOAD',
  'LOGIN_FAILED',
  'LOGIN_SUCCESS',
  'R2_CONFIG_UPDATE',
  'UPLOAD_PRESIGN',
  'USER_CREATE',
  'USER_DELETE',
  'USER_RESET_PASSWORD',
  'USER_UPDATE',
]

const actionOptions = computed(() => {
  const actionSet = new Set(knownActions)

  for (const row of logs.value) {
    if (!row?.action) continue
    actionSet.add(String(row.action))
  }

  const currentAction = String(filters.value.action ?? '').trim()
  if (currentAction) {
    actionSet.add(currentAction)
  }

  return [
    { label: t('audit.allActions'), value: '' },
    ...Array.from(actionSet)
      .sort((a, b) => a.localeCompare(b, locale.value))
      .map((action) => ({ label: action, value: action })),
  ]
})

const actorOptions = computed(() => {
  const actorMap = new Map()

  for (const user of users.value) {
    if (!user?.id) continue
    actorMap.set(String(user.id), String(user.username ?? user.id))
  }

  for (const row of logs.value) {
    if (!row?.actor_user_id) continue
    const id = String(row.actor_user_id)
    if (actorMap.has(id)) continue
    actorMap.set(id, String(row.actor_username ?? id))
  }

  const currentActorId = String(filters.value.actor_user_id ?? '').trim()
  if (currentActorId && !actorMap.has(currentActorId)) {
    actorMap.set(currentActorId, currentActorId)
  }

  const sorted = Array.from(actorMap.entries()).sort(([_idA, labelA], [_idB, labelB]) =>
    labelA.localeCompare(labelB, locale.value)
  )

  return [
    { label: t('audit.allActors'), value: '' },
    ...sorted.map(([value, label]) => ({ label, value })),
  ]
})

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const normalizeId = (value) => String(value ?? '').trim()
const pageRowIds = computed(() =>
  logs.value
    .map((row) => normalizeId(row?.id))
    .filter(Boolean)
)
const selectedIdSet = computed(() => new Set(selectedIds.value.map((id) => normalizeId(id)).filter(Boolean)))
const allRowsSelected = computed(() => {
  const ids = pageRowIds.value
  if (!ids.length) return false
  const set = selectedIdSet.value
  return ids.every((id) => set.has(id))
})
const someRowsSelected = computed(() => {
  const ids = pageRowIds.value
  if (!ids.length) return false
  const set = selectedIdSet.value
  return ids.some((id) => set.has(id))
})
const selectAllIndeterminate = computed(() => someRowsSelected.value && !allRowsSelected.value)

const toggleSelectAll = (checked) => {
  if (checked) {
    selectedIds.value = [...pageRowIds.value]
    return
  }
  selectedIds.value = []
}

const toggleRowSelection = (rowId, checked) => {
  const id = normalizeId(rowId)
  if (!id) return

  const next = new Set(selectedIds.value.map((value) => normalizeId(value)).filter(Boolean))
  if (checked) {
    next.add(id)
  } else {
    next.delete(id)
  }
  selectedIds.value = Array.from(next)
}

const openDeleteModal = (ids) => {
  const normalized = Array.from(new Set(ids.map((id) => normalizeId(id)).filter(Boolean)))
  if (!normalized.length) return
  pendingDeleteIds.value = normalized
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  pendingDeleteIds.value = []
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

const deleteConfirmText = computed(() => {
  const count = pendingDeleteIds.value.length
  if (count <= 1) return t('audit.confirmDelete')
  return t('audit.confirmBatchDelete', { count })
})

const handleDeleteRow = (row) => {
  const id = normalizeId(row?.id)
  if (!id) return
  openDeleteModal([id])
}

const handleBatchDelete = () => {
  if (!selectedIds.value.length) return
  openDeleteModal([...selectedIds.value])
}

const handleDeleteConfirm = async () => {
  if (deleting.value) return

  const ids = pendingDeleteIds.value.map((id) => normalizeId(id)).filter(Boolean)
  if (!ids.length) return

  deleting.value = true
  try {
    if (ids.length === 1) {
      await api.deleteAuditLog(ids[0])
    } else {
      await api.batchDeleteAuditLogs(ids)
    }

    message.success(t('audit.messages.deleteSuccess', { count: ids.length }))

    closeDeleteModal()
    selectedIds.value = []

    if (ids.length >= logs.value.length && pagination.value.page > 1) {
      pagination.value.page -= 1
    }

    await loadLogs()
  } catch (error) {
    message.error(t('audit.messages.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

const columns = computed(() => [
  {
    title: '',
    key: 'select',
    width: 48,
    align: 'center',
    ellipsis: false,
    titleRender: () => h('input', {
      class: 'audit-checkbox',
      type: 'checkbox',
      disabled: loading.value || pageRowIds.value.length === 0,
      checked: allRowsSelected.value,
      indeterminate: selectAllIndeterminate.value,
      onChange: (event) => toggleSelectAll(Boolean(event?.target?.checked))
    }),
    render: (row) => {
      const id = normalizeId(row?.id)
      return h('input', {
        class: 'audit-checkbox',
        type: 'checkbox',
        disabled: loading.value || !id,
        checked: selectedIdSet.value.has(id),
        onChange: (event) => toggleRowSelection(id, Boolean(event?.target?.checked))
      })
    }
  },
  {
    title: t('audit.columns.time'),
    key: 'created_at',
    width: 200,
    align: 'center',
    render: (row) => {
      const text = row.created_at
        ? new Date(row.created_at).toLocaleString(locale.value)
        : '-'
      return h('span', text)
    }
  },
  {
    title: t('audit.columns.action'),
    key: 'action',
    width: 150,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.action)
      if (text === '-') return text
      return h(Tag, { type: 'info', size: 'small' }, () => text)
    }
  },
  {
    title: t('audit.columns.actor'),
    key: 'actor',
    width: 140,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.actor_username || row.actor_user_id)
      return h('span', text)
    }
  },
  {
    title: t('audit.columns.ip'),
    key: 'ip',
    width: 120,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.ip)
      return h('span', text)
    }
  },
  {
    title: t('audit.columns.userAgent'),
    key: 'user_agent',
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.user_agent)
      return h(Tooltip, { content: text }, () =>
        h('span', { style: 'font-size: 12px; color: var(--nb-gray-500);' }, text)
      )
    }
  },
  {
    title: t('audit.columns.actions'),
    key: 'actions',
    width: locale.value === 'zh-CN' ? 120 : 160,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const id = normalizeId(row?.id)
      return h('div', { class: 'action-buttons' }, [
        h(Button, {
          size: 'small',
          type: 'danger',
          disabled: deleting.value || loading.value || !id,
          onClick: () => handleDeleteRow(row)
        }, () => [
          h(Trash2, { size: 16, style: 'margin-right: 4px' }),
          t('audit.actions.delete')
        ])
      ])
    }
  }
])

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

const loadUsers = async () => {
  if (users.value.length) return
  usersLoading.value = true
  try {
    const result = await api.getUsers({ page: 1, limit: 100 })
    users.value = (result.users || []).filter((u) => u.status !== 'deleted')
  } catch (error) {
    message.error(t('audit.loadUsersFailed'))
  } finally {
    usersLoading.value = false
  }
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params = { page: pagination.value.page, limit: pagination.value.pageSize }
    const action = String(filters.value.action ?? '').trim()
    if (action) params.action = action

    const actorUserId = String(filters.value.actor_user_id ?? '').trim()
    if (actorUserId) params.actor_user_id = actorUserId

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

    const result = await api.getAudit(params)
    logs.value = result.logs || []
    pagination.value.itemCount = result.total
    selectedIds.value = []
  } catch (error) {
    message.error(t('audit.loadLogsFailed'))
  } finally {
    loading.value = false
    activeAction.value = ''
  }
}

const handleSearch = () => {
  if (loading.value) return
  activeAction.value = 'search'
  pagination.value.page = 1
  loadLogs()
}

const handleRefresh = () => {
  if (loading.value) return
  activeAction.value = 'refresh'
  loadLogs()
}

const changePage = (page) => {
  pagination.value.page = page
  loadLogs()
}

const changePageSize = (pageSize) => {
  const nextSize = Number(pageSize)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  pagination.value.pageSize = nextSize
  pagination.value.page = 1
  loadLogs()
}

onMounted(() => {
  loadLogs()
  loadUsers()
})
</script>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.audit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.audit-title-group {
  min-width: 0;
}

.audit-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.audit-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.audit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
}

.audit-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.audit-table-card {
  /* min-height removed */
}

.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.filter-item.action {
  width: 160px;
}

.filter-item.actor {
  width: 160px;
}

.filter-item.created-range {
  width: 280px;
}

:deep(.audit-table .brutal-table) {
  table-layout: fixed;
}

:deep(.audit-table .brutal-table th),
:deep(.audit-table .brutal-table td) {
  white-space: nowrap;
}

:deep(.audit-checkbox) {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--nb-primary);
}

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.audit-delete-confirm {
  margin: 0;
  color: var(--nb-ink);
}

@media (max-width: 720px) {
  .audit-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .audit-actions {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
