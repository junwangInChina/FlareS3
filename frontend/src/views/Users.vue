<template>
  <AppLayout>
    <BrutalCard title="用户列表">
      <template #header-extra>
        <BrutalButton type="primary" size="small" @click="showCreateModal = true">创建用户</BrutalButton>
      </template>

      <BrutalTable :columns="columns" :data="users" :loading="loading" />
    </BrutalCard>

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
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
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
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const users = ref([])
const loading = ref(false)

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

const columns = [
  { title: '用户名', key: 'username' },
  { title: '角色', key: 'role', width: 100 },
  { title: '状态', key: 'status', width: 100, render: (row) => h(BrutalTag, { type: row.status === 'active' ? 'success' : 'danger', size: 'small' }, () => row.status) },
  { title: '配额', key: 'quota_bytes', width: 140, render: (row) => h('span', formatBytes(row.quota_bytes)) },
  {
    title: '操作', key: 'actions', width: 260,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(BrutalButton, { size: 'small', type: row.status === 'active' ? 'default' : 'primary', onClick: () => toggleStatus(row) }, () => row.status === 'active' ? '禁用' : '启用'),
      h(BrutalButton, { size: 'small', type: 'default', onClick: () => openReset(row) }, () => '重置密码'),
      h(BrutalButton, { size: 'small', type: 'danger', onClick: () => handleDelete(row) }, () => '删除')
    ])
  }
]

const loadUsers = async () => {
  loading.value = true
  try {
    const result = await api.getUsers({ page: 1, limit: 100 })
    users.value = result.users || []
  } catch (error) {
    message.error('加载用户失败')
  } finally {
    loading.value = false
  }
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
    loadUsers()
  } catch (error) {
    message.error('删除用户失败')
  }
}

onMounted(() => loadUsers())
</script>
