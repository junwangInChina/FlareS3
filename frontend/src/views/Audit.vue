<template>
  <div class="audit-page">
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
          <n-button quaternary @click="router.push('/users')">用户管理</n-button>
          <n-button quaternary type="error" @click="handleLogout">退出</n-button>
        </n-space>
      </n-layout-header>

      <n-layout-content class="content">
        <n-card title="操作审计">
          <template #header-extra>
            <n-space align="center" :size="12">
              <n-input
                v-model:value="filters.action"
                placeholder="动作"
                size="small"
                clearable
                style="width: 140px;"
              />
              <n-input
                v-model:value="filters.actor"
                placeholder="操作者 ID"
                size="small"
                clearable
                style="width: 160px;"
              />
              <n-button size="small" @click="handleSearch">查询</n-button>
              <n-button size="small" @click="handleReset">重置</n-button>
            </n-space>
          </template>

          <n-data-table
            :columns="columns"
            :data="logs"
            :loading="loading"
            :pagination="pagination"
            :bordered="false"
          />
        </n-card>
      </n-layout-content>
    </n-layout>
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
  NInput,
  NDataTable,
  NTag,
  useMessage
} from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const logs = ref([])
const loading = ref(false)
const filters = ref({
  action: '',
  actor: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page) => {
    pagination.value.page = page
    loadLogs()
  },
  onUpdatePageSize: (pageSize) => {
    pagination.value.pageSize = pageSize
    pagination.value.page = 1
    loadLogs()
  }
})

const formatTarget = (row) => {
  if (row.target_type && row.target_id) return `${row.target_type}:${row.target_id}`
  return row.target_type || row.target_id || '-'
}

const columns = [
  {
    title: '时间',
    key: 'created_at',
    width: 180,
    render: (row) => new Date(row.created_at).toLocaleString('zh-CN')
  },
  {
    title: '动作',
    key: 'action',
    width: 140,
    render: (row) => h(NTag, { size: 'small', type: 'info' }, { default: () => row.action })
  },
  {
    title: '操作者',
    key: 'actor',
    width: 160,
    render: (row) => row.actor_username || row.actor_user_id || '-'
  },
  {
    title: '目标',
    key: 'target',
    width: 200,
    render: (row) => formatTarget(row)
  },
  {
    title: 'IP',
    key: 'ip',
    width: 140,
    render: (row) => row.ip || '-'
  },
  {
    title: 'User-Agent',
    key: 'user_agent',
    ellipsis: { tooltip: true }
  },
  {
    title: '元数据',
    key: 'metadata',
    ellipsis: { tooltip: true }
  }
]

const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.pageSize
    }
    const action = filters.value.action?.trim()
    const actor = filters.value.actor?.trim()
    if (action) params.action = action
    if (actor) params.actor_user_id = actor

    const result = await api.getAudit(params)
    logs.value = result.logs || []
    pagination.value.itemCount = result.total
  } catch (error) {
    message.error('加载审计日志失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadLogs()
}

const handleReset = () => {
  filters.value = { action: '', actor: '' }
  pagination.value.page = 1
  loadLogs()
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.audit-page {
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
