<template>
  <AppLayout>
    <div class="users-page">
      <header class="users-header">
        <div class="users-title-group">
          <h1 class="users-title">用户列表</h1>
          <p class="users-subtitle">
            管理系统用户、角色及配额
          </p>
        </div>

        <div class="users-actions">
          <div class="filter-row">
            <div class="filter-item username">
              <Input
                v-model="filters.q"
                placeholder="用户名"
                size="small"
                clearable
                @keyup.enter="handleSearch"
              />
            </div>

            <div class="filter-item status">
              <Select v-model="filters.status" :options="statusOptions" size="small" />
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

          <Button type="primary" size="small" :disabled="loading" @click="showCreateModal = true">
            <Plus :size="16" style="margin-right: 6px" />
            创建用户
          </Button>
        </div>
      </header>

      <section class="users-content">
        <Card class="users-table-card">
          <Table class="users-table" :columns="columns" :data="users" :loading="loading" />

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

      <Modal v-model:show="showCreateModal" title="创建用户" width="480px">
        <FormItem label="用户名">
          <Input v-model="createForm.username" placeholder="请输入用户名" />
        </FormItem>
        <FormItem label="密码">
          <Input v-model="createForm.password" type="password" placeholder="请输入密码" />
        </FormItem>
        <FormItem label="角色">
          <Select v-model="createForm.role" :options="roleOptions" />
        </FormItem>
        <FormItem label="配额">
          <Input v-model="createForm.quota_bytes" placeholder="例如 10737418240" />
        </FormItem>

        <template #footer>
          <Button type="default" @click="showCreateModal = false">取消</Button>
          <Button type="primary" :loading="creating" @click="handleCreate">创建</Button>
        </template>
      </Modal>

      <Modal v-model:show="showResetModal" title="重置密码" width="420px">
        <FormItem label="新密码">
          <Input v-model="resetForm.password" type="password" placeholder="请输入新密码" />
        </FormItem>

        <template #footer>
          <Button type="default" @click="showResetModal = false">取消</Button>
          <Button type="primary" :loading="resetting" @click="handleResetPassword">提交</Button>
        </template>
      </Modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { KeyRound, Trash2, UserCheck, UserX, Plus, Search, RefreshCw } from 'lucide-vue-next'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from "../components/ui/card/Card.vue"
import Button from "../components/ui/button/Button.vue"
import Table from "../components/ui/table/Table.vue"
import Modal from "../components/ui/modal/Modal.vue"
import FormItem from "../components/ui/form-item/FormItem.vue"
import Input from "../components/ui/input/Input.vue"
import Select from "../components/ui/select/Select.vue"
import DateRangePicker from '../components/ui/date-range-picker/DateRangePicker.vue'
import Tag from "../components/ui/tag/Tag.vue"
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const users = ref([])
const loading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })
const activeAction = ref('')

const filters = ref({
  q: '',
  status: '',
  created_from_date: '',
  created_to_date: '',
})

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' }
]

const showCreateModal = ref(false)
const createForm = ref({ username: '', password: '', role: 'user', quota_bytes: '10737418240' })
const creating = ref(false)

const showResetModal = ref(false)
const resetForm = ref({ userId: '', password: '' })
const resetting = ref(false)

const formatBytes = (bytes) => {
  const unit = 1024
  if (bytes < unit) return `${bytes} B`
  let div = unit, exp = 0
  while (bytes / div >= unit && exp < 4) { div *= unit; exp++ }
  return `${(bytes / div).toFixed(2)} ${['KB', 'MB', 'GB', 'TB', 'PB'][exp]}`
}

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 'active' },
  { label: '禁用', value: 'disabled' },
  { label: '已删除', value: 'deleted' },
]

const columns = [
  {
    title: '用户名',
    key: 'username',
    align: 'left',
    ellipsis: false,
    render: (row) => h('span', toDisplayText(row.username))
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    align: 'center',
    ellipsis: false,
    render: (row) => h('span', toDisplayText(row.role))
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const text = toDisplayText(row.status)
      const type = row.status === 'active' ? 'success' : row.status === 'disabled' ? 'warning' : 'danger'
      return h(Tag, { type, size: 'small' }, () => text)
    }
  },
  {
    title: '配额',
    key: 'quota_bytes',
    width: 140,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const text = formatBytes(row.quota_bytes || 0)
      return h('span', text)
    }
  },
  {
    title: '操作', key: 'actions', width: 330, align: 'center', ellipsis: false,
    render: (row) => h('div', { class: 'action-buttons' }, [
      h(Button, { size: 'small', type: 'default', onClick: () => toggleStatus(row) }, () => [
        row.status === 'active'
          ? h(UserX, { size: 16, style: 'margin-right: 4px' })
          : h(UserCheck, { size: 16, style: 'margin-right: 4px' }),
        row.status === 'active' ? '禁用' : '启用'
      ]),
      h(Button, { size: 'small', type: 'default', onClick: () => openReset(row) }, () => [
        h(KeyRound, { size: 16, style: 'margin-right: 4px' }),
        '重置密码'
      ]),
      h(Button, { size: 'small', type: 'danger', onClick: () => handleDelete(row) }, () => [
        h(Trash2, { size: 16, style: 'margin-right: 4px' }),
        '删除'
      ])
    ])
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

const buildQueryParams = () => {
  const params = {}

  const q = filters.value.q?.trim()
  if (q) params.q = q

  if (filters.value.status) {
    params.status = filters.value.status
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
  loading.value = true
  try {
    const result = await api.getUsers({
      page: pagination.value.page,
      limit: pagination.value.pageSize,
      ...buildQueryParams(),
    })
    users.value = result.users || []
    pagination.value.itemCount = Number(result.total || 0)
  } catch (error) {
    message.error('加载用户失败')
  } finally {
    loading.value = false
    activeAction.value = ''
  }
}

const handleSearch = () => {
  if (loading.value) return
  activeAction.value = 'search'
  pagination.value.page = 1
  loadUsers()
}

const handleRefresh = () => {
  if (loading.value) return
  activeAction.value = 'refresh'
  loadUsers()
}

const changePage = (page) => {
  pagination.value.page = page
  loadUsers()
}

const handleCreate = async () => {
  if (!createForm.value.username || !createForm.value.password) {
    message.error('请填写用户名和密码')
    return
  }
  try {
    creating.value = true
    await api.createUser({
      username: createForm.value.username,
      password: createForm.value.password,
      role: createForm.value.role,
      quota_bytes: Number(createForm.value.quota_bytes)
    })
    message.success('用户创建成功')
    showCreateModal.value = false
    createForm.value = { username: '', password: '', role: 'user', quota_bytes: '10737418240' }
    pagination.value.page = 1
    loadUsers()
  } catch (error) {
    message.error(error.response?.data?.error || '创建用户失败')
  } finally {
    creating.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const status = row.status === 'active' ? 'disabled' : 'active'
    await api.updateUser(row.id, { status })
    message.success('状态已更新')
    loadUsers()
  } catch (error) {
    message.error('更新状态失败')
  }
}

const openReset = (row) => {
  resetForm.value = { userId: row.id, password: '' }
  showResetModal.value = true
}

const handleResetPassword = async () => {
  if (!resetForm.value.password) {
    message.error('请输入新密码')
    return
  }
  try {
    resetting.value = true
    await api.resetUserPassword(resetForm.value.userId, resetForm.value.password)
    message.success('密码已重置')
    showResetModal.value = false
  } catch (error) {
    message.error(error.response?.data?.error || '重置失败')
  } finally {
    resetting.value = false
  }
}

const handleDelete = async (row) => {
  if (!confirm('确定删除此用户？')) return
  try {
    await api.deleteUser(row.id)
    message.success('用户已删除')
    if (users.value.length <= 1 && pagination.value.page > 1) pagination.value.page -= 1
    loadUsers()
  } catch (error) {
    message.error('删除用户失败')
  }
}

onMounted(() => loadUsers())
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.users-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.users-title-group {
  min-width: 0;
}

.users-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.users-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.users-actions {
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

.filter-item.username {
  width: 160px;
}

.filter-item.status {
  width: 120px;
}

.filter-item.created-range {
  width: 280px;
}

.users-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.users-table-card {
  /* min-height removed */
}

:deep(.users-table .brutal-table),
:deep(.users-table .shadcn-table) {
  table-layout: fixed;
}

:deep(.users-table .brutal-table th),
:deep(.users-table .brutal-table td),
:deep(.users-table .shadcn-table th),
:deep(.users-table .shadcn-table td) {
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

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

:root[data-ui-theme="shadcn"] :deep(.action-buttons) {
  gap: 8px;
}

@media (max-width: 720px) {
  .users-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .users-actions {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
