<template>
  <AppLayout>
    <div class="audit-page">
      <header class="audit-header">
        <div class="audit-title-group">
          <h1 class="audit-title">审计日志</h1>
          <p class="audit-subtitle">
            查看系统内的所有操作记录
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
              搜索
            </Button>
            <Button
              type="default"
              size="small"
              :loading="loading && activeAction === 'refresh'"
              :disabled="loading"
              @click="handleRefresh"
            >
              <RefreshCw :size="16" style="margin-right: 6px" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      <section class="audit-content">
        <Card class="audit-table-card">
          <Table class="audit-table" :columns="columns" :data="logs" :loading="loading" />

          <div v-if="pagination.itemCount > 0" class="pagination">
            <span>共 {{ pagination.itemCount }} 条</span>
            <div class="page-btns">
              <Button
                size="small"
                type="ghost"
                :disabled="pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >上一页</Button>
              <span class="page-info">{{ pagination.page }}</span>
              <Button
                size="small"
                type="ghost"
                :disabled="pagination.page * pagination.pageSize >= pagination.itemCount"
                @click="changePage(pagination.page + 1)"
              >下一页</Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, ref, h, onMounted } from 'vue'
import { RefreshCw, Search } from 'lucide-vue-next'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from "../components/ui/card/Card.vue"
import Button from "../components/ui/button/Button.vue"
import Select from "../components/ui/select/Select.vue"
import Table from "../components/ui/table/Table.vue"
import DateRangePicker from '../components/ui/date-range-picker/DateRangePicker.vue'
import Tag from "../components/ui/tag/Tag.vue"
import Tooltip from "../components/ui/tooltip/Tooltip.vue"
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const logs = ref([])
const loading = ref(false)
const activeAction = ref('')
const filters = ref({ action: '', actor_user_id: '', created_from_date: '', created_to_date: '' })
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })

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
    { label: '全部动作', value: '' },
    ...Array.from(actionSet)
      .sort((a, b) => a.localeCompare(b))
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
    labelA.localeCompare(labelB, 'zh-CN')
  )

  return [
    { label: '全部操作者', value: '' },
    ...sorted.map(([value, label]) => ({ label, value })),
  ]
})

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const columns = [
  {
    title: '时间',
    key: 'created_at',
    width: 200,
    align: 'center',
    render: (row) => {
      const text = row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-'
      return h('span', text)
    }
  },
  {
    title: '动作',
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
    title: '操作者',
    key: 'actor',
    width: 140,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.actor_username || row.actor_user_id)
      return h('span', text)
    }
  },
  {
    title: 'IP',
    key: 'ip',
    width: 120,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.ip)
      return h('span', text)
    }
  },
  {
    title: 'User-Agent',
    key: 'user_agent',
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.user_agent)
      return h(Tooltip, { content: text }, () =>
        h('span', { style: 'font-size: 12px; color: var(--nb-gray-500);' }, text)
      )
    }
  }
]

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
    message.error('加载用户列表失败')
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
  } catch (error) {
    message.error('加载审计日志失败')
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

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-top: var(--nb-border);
}

/* shadcn/ui theme: Modern pagination style */
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
