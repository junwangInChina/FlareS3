<template>
  <div class="users-page">
    <n-layout>
      <n-layout-header class="header">
        <div class="header-left">
          <div class="logo">
            <img src="/logo.png" alt="R2Box" class="logo-icon" />
            <span class="logo-text">R2Box</span>
          </div>
        </div>
        <n-space align="center" :size="16">
          <n-button quaternary @click="router.push('/')">上传文件</n-button>
          <n-button quaternary @click="router.push('/files')">文件列表</n-button>
          <n-button quaternary @click="router.push('/stats')">存储统计</n-button>
          <n-button quaternary @click="router.push('/audit')">审计日志</n-button>
          <n-button quaternary type="error" @click="handleLogout">退出</n-button>
        </n-space>
      </n-layout-header>

      <n-layout-content class="content">
        <n-card title="用户管理">
          <template #header-extra>
            <n-button type="primary" @click="showCreateModal = true">创建用户</n-button>
          </template>

          <n-data-table
            :columns="columns"
            :data="users"
            :loading="loading"
            :pagination="pagination"
            :bordered="false"
          />
        </n-card>
      </n-layout-content>
    </n-layout>

    <n-modal v-model:show="showCreateModal" preset="card" title="创建用户" style="width: 480px;">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="createForm.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="createForm.password" type="password" show-password-on="click" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item label="角色" path="role">
          <n-select v-model:value="createForm.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item label="配额" path="quota_bytes">
          <n-input v-model:value="createForm.quota_bytes" placeholder="例如 10737418240" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showResetModal" preset="card" title="重置密码" style="width: 420px;">
      <n-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-width="90">
        <n-form-item label="新密码" path="password">
          <n-input v-model:value="resetForm.password" type="password" show-password-on="click" placeholder="请输入新密码" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showResetModal = false">取消</n-button>
          <n-button type="primary" :loading="resetting" @click="handleResetPassword">提交</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NSpace,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NTag,
  NPopconfirm,
  useMessage
} from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const users = ref([])
const loading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page) => {
    pagination.value.page = page
    loadUsers()
  },
  onUpdatePageSize: (pageSize) => {
    pagination.value.pageSize = pageSize
    pagination.value.page = 1
    loadUsers()
  }
})

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' }
]

const showCreateModal = ref(false)
const createFormRef = ref(null)
const createForm = ref({
  username: '',
  password: '',
  role: 'user',
  quota_bytes: '10737418240'
})
const createRules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
  quota_bytes: { required: true, message: '请输入配额', trigger: 'blur' }
}
const creating = ref(false)

const showResetModal = ref(false)
const resetFormRef = ref(null)
const resetForm = ref({
  userId: '',
  password: ''
})
const resetRules = {
  password: { required: true, message: '请输入新密码', trigger: 'blur' }
}
const resetting = ref(false)

const formatBytes = (bytes) => {
  const unit = 1024
  if (bytes < unit) return `${bytes} B`
  let div = unit
  let exp = 0
  while (bytes / div >= unit && exp < 4) {
    div *= unit
    exp += 1
  }
  const value = bytes / div
  const suffix = ['KB', 'MB', 'GB', 'TB', 'PB'][exp]
  return `${value.toFixed(2)} ${suffix}`
}

const columns = [
  { title: '用户名', key: 'username' },
  { title: '角色', key: 'role', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 'active' ? 'success' : 'error', size: 'small' }, { default: () => row.status })
  },
  {
    title: '配额',
    key: 'quota_bytes',
    width: 140,
    render: (row) => formatBytes(row.quota_bytes)
  },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(
        NButton,
        {
          size: 'small',
          type: row.status === 'active' ? 'warning' : 'success',
          onClick: () => toggleStatus(row)
        },
        { default: () => row.status === 'active' ? '禁用' : '启用' }
      ),
      h(
        NButton,
        { size: 'small', onClick: () => openReset(row) },
        { default: () => '重置密码' }
      ),
      h(
        NPopconfirm,
        {
          positiveText: '确定',
          negativeText: '取消',
          onPositiveClick: () => handleDelete(row)
        },
        {
          trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
          default: () => '确定删除此用户？'
        }
      )
    ])
  }
]

const loadUsers = async () => {
  loading.value = true
  try {
    const result = await api.getUsers({ page: pagination.value.page, limit: pagination.value.pageSize })
    users.value = result.users || []
    pagination.value.itemCount = result.total
  } catch (error) {
    message.error('加载用户失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  try {
    await createFormRef.value?.validate()
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
  try {
    await resetFormRef.value?.validate()
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
  try {
    await api.deleteUser(row.id)
    message.success('用户已删除')
    loadUsers()
  } catch (error) {
    message.error('删除用户失败')
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
  min-height: 100vh;
  background: #fafafa;
}

.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #eaeaea;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #333;
}

.content {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
