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
          <BrutalButton type="primary" size="default" @click="showCreateModal = true">
            <Plus :size="16" style="margin-right: 6px" />
            创建用户
          </BrutalButton>
        </div>
      </header>

      <section class="users-content">
        <BrutalCard class="users-table-card">
          <BrutalTable class="users-table" :columns="columns" :data="users" :loading="loading" />

          <div v-if="pagination.itemCount > 0" class="pagination">
            <span>共 {{ pagination.itemCount }} 条</span>
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
                :disabled="pagination.page * pagination.pageSize >= pagination.itemCount"
                @click="changePage(pagination.page + 1)"
              >下一页</BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </section>

      <BrutalModal v-model:show="showCreateModal" title="创建用户" width="480px">
        <BrutalFormItem label="用户名">
          <BrutalInput v-model="createForm.username" placeholder="请输入用户名" />
        </BrutalFormItem>
        <BrutalFormItem label="密码">
          <BrutalInput v-model="createForm.password" type="password" placeholder="请输入密码" />
        </BrutalFormItem>
        <BrutalFormItem label="角色">
          <BrutalSelect v-model="createForm.role" :options="roleOptions" />
        </BrutalFormItem>
        <BrutalFormItem label="配额">
          <BrutalInput v-model="createForm.quota_bytes" placeholder="例如 10737418240" />
        </BrutalFormItem>

        <template #footer>
          <BrutalButton type="default" @click="showCreateModal = false">取消</BrutalButton>
          <BrutalButton type="primary" :loading="creating" @click="handleCreate">创建</BrutalButton>
        </template>
      </BrutalModal>

      <BrutalModal v-model:show="showResetModal" title="重置密码" width="420px">
        <BrutalFormItem label="新密码">
          <BrutalInput v-model="resetForm.password" type="password" placeholder="请输入新密码" />
        </BrutalFormItem>

        <template #footer>
          <BrutalButton type="default" @click="showResetModal = false">取消</BrutalButton>
          <BrutalButton type="primary" :loading="resetting" @click="handleResetPassword">提交</BrutalButton>
        </template>
      </BrutalModal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { KeyRound, Trash2, UserCheck, UserX, Plus } from 'lucide-vue-next'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import BrutalCard from '../components/ui/BrutalCard.vue'
import BrutalButton from '../components/ui/BrutalButton.vue'
import BrutalTable from '../components/ui/BrutalTable.vue'
import BrutalModal from '../components/ui/BrutalModal.vue'
import BrutalFormItem from '../components/ui/BrutalFormItem.vue'
import BrutalInput from '../components/ui/BrutalInput.vue'
import BrutalSelect from '../components/ui/BrutalSelect.vue'
import BrutalTag from '../components/ui/BrutalTag.vue'
import Tooltip from '../components/ui/Tooltip.vue'
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const users = ref([])
const loading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })

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

const withTooltip = (content, vnode) => {
  const text = toDisplayText(content)
  return h(Tooltip, { content: text }, () => vnode ?? text)
}

const columns = [
  {
    title: '用户名',
    key: 'username',
    align: 'left',
    render: (row) => withTooltip(row.username)
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    align: 'center',
    render: (row) => withTooltip(row.role)
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.status)
      return withTooltip(text, h(BrutalTag, { type: row.status === 'active' ? 'success' : 'danger', size: 'small' }, () => text))
    }
  },
  {
    title: '配额',
    key: 'quota_bytes',
    width: 140,
    align: 'center',
    render: (row) => {
      const text = formatBytes(row.quota_bytes || 0)
      return withTooltip(text)
    }
  },
  {
    title: '操作', key: 'actions', width: 300, align: 'center', ellipsis: false,
    render: (row) => h('div', { class: 'action-buttons' }, [
      h(BrutalButton, { size: 'small', type: 'default', onClick: () => toggleStatus(row) }, () => [
        row.status === 'active'
          ? h(UserX, { size: 16, style: 'margin-right: 4px' })
          : h(UserCheck, { size: 16, style: 'margin-right: 4px' }),
        row.status === 'active' ? '禁用' : '启用'
      ]),
      h(BrutalButton, { size: 'small', type: 'default', onClick: () => openReset(row) }, () => [
        h(KeyRound, { size: 16, style: 'margin-right: 4px' }),
        '重置密码'
      ]),
      h(BrutalButton, { size: 'small', type: 'danger', onClick: () => handleDelete(row) }, () => [
        h(Trash2, { size: 16, style: 'margin-right: 4px' }),
        '删除'
      ])
    ])
  }
]

const loadUsers = async () => {
  loading.value = true
  try {
    const result = await api.getUsers({ page: pagination.value.page, limit: pagination.value.pageSize })
    users.value = result.users || []
    pagination.value.itemCount = Number(result.total || 0)
  } catch (error) {
    message.error('加载用户失败')
  } finally {
    loading.value = false
  }
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

.users-content {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.users-table-card {
  /* min-height removed */
}

:deep(.users-table .brutal-table) {
  table-layout: fixed;
}

:deep(.users-table .brutal-table th),
:deep(.users-table .brutal-table td) {
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