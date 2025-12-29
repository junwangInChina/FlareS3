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
            <Input v-model="filters.action" placeholder="动作" size="small" clearable />
            <Input v-model="filters.actor" placeholder="操作者 ID" size="small" clearable />
            <Button type="default" size="small" @click="handleSearch">查询</Button>
            <Button type="ghost" size="small" @click="handleReset">重置</Button>
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
import { ref, h, onMounted } from 'vue'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from "../components/ui/card/Card.vue"
import Button from "../components/ui/button/Button.vue"
import Input from "../components/ui/input/Input.vue"
import Table from "../components/ui/table/Table.vue"
import Tag from "../components/ui/tag/Tag.vue"
import Tooltip from "../components/ui/tooltip/Tooltip.vue"
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
    title: '时间',
    key: 'created_at',
    width: 200,
    align: 'center',
    render: (row) => {
      const text = row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-'
      return withTooltip(text)
    }
  },
  {
    title: '动作',
    key: 'action',
    width: 150,
    align: 'center',
    render: (row) => {
      const text = toDisplayText(row.action)
      return withTooltip(text, h(Tag, { type: 'info', size: 'small' }, () => text))
    }
  },
  {
    title: '操作者',
    key: 'actor',
    width: 140,
    align: 'center',
    render: (row) => {
      const text = row.actor_username || row.actor_user_id || '-'
      return withTooltip(text)
    }
  },
  {
    title: '目标',
    key: 'target',
    width: 180,
    align: 'center',
    render: (row) => {
      const text = formatTarget(row)
      return withTooltip(text)
    }
  },
  {
    title: 'IP',
    key: 'ip',
    width: 120,
    align: 'center',
    render: (row) => {
      const text = row.ip || '-'
      return withTooltip(text)
    }
  },
  {
    title: 'User-Agent',
    key: 'user_agent',
    align: 'left',
    render: (row) => {
      const text = row.user_agent || '-'
      return withTooltip(text, h('span', { style: 'font-size: 12px; color: var(--nb-gray-500);' }, text))
    }
  }
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
}

.filter-row > :first-child,
.filter-row > :nth-child(2) {
  width: 140px;
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
