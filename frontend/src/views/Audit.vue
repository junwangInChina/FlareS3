<template>
  <AppLayout>
    <BrutalCard title="审计日志">
      <template #header-extra>
        <div class="filter-row">
          <BrutalInput v-model="filters.action" placeholder="动作" size="small" />
          <BrutalInput v-model="filters.actor" placeholder="操作者 ID" size="small" />
          <BrutalButton type="default" size="small" @click="handleSearch">查询</BrutalButton>
          <BrutalButton type="ghost" size="small" @click="handleReset">重置</BrutalButton>
        </div>
      </template>

      <BrutalTable :columns="columns" :data="logs" :loading="loading" />

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
  </AppLayout>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import BrutalCard from '../components/ui/BrutalCard.vue'
import BrutalButton from '../components/ui/BrutalButton.vue'
import BrutalInput from '../components/ui/BrutalInput.vue'
import BrutalTable from '../components/ui/BrutalTable.vue'
import BrutalTag from '../components/ui/BrutalTag.vue'
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const logs = ref([])
const loading = ref(false)
const filters = ref({ action: '', actor: '' })
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0 })

const formatTarget = (row) => {
  if (row.target_type && row.target_id) return `${row.target_type}:${row.target_id}`
  return row.target_type || row.target_id || '-'
}

const columns = [
  { title: '时间', key: 'created_at', width: 160, render: (row) => h('span', new Date(row.created_at).toLocaleString('zh-CN')) },
  { title: '动作', key: 'action', width: 120, render: (row) => h(BrutalTag, { type: 'info', size: 'small' }, () => row.action) },
  { title: '操作者', key: 'actor', width: 140, render: (row) => h('span', row.actor_username || row.actor_user_id || '-') },
  { title: '目标', key: 'target', width: 180, render: (row) => h('span', formatTarget(row)) },
  { title: 'IP', key: 'ip', width: 120, render: (row) => h('span', row.ip || '-') },
  { title: 'User-Agent', key: 'user_agent', render: (row) => h('span', { style: 'font-size: 12px; color: var(--nb-gray-500);' }, row.user_agent || '-') }
]

const loadLogs = async () => {
  loading.value = true
  try {
    const params = { page: pagination.value.page, limit: pagination.value.pageSize }
    if (filters.value.action?.trim()) params.action = filters.value.action.trim()
    if (filters.value.actor?.trim()) params.actor_user_id = filters.value.actor.trim()

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

const changePage = (page) => {
  pagination.value.page = page
  loadLogs()
}

onMounted(() => loadLogs())
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
}

.filter-row > :first-child,
.filter-row > :nth-child(2) {
  width: 140px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--nb-space-lg);
  padding-top: var(--nb-space-md);
  border-top: 2px dashed var(--nb-black);
}

.page-btns {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.page-info {
  font-family: var(--nb-font-mono);
  font-weight: 700;
  padding: 0 var(--nb-space-sm);
}
</style>
