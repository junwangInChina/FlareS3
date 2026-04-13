<template>
  <AppLayout>
    <div class="dashboard-page">
      <header class="dashboard-header">
        <div class="dashboard-title-group">
          <h1 class="dashboard-title">{{ t('dashboard.title') }}</h1>
          <p class="dashboard-subtitle">{{ t('dashboard.subtitle') }}</p>
        </div>

        <div class="dashboard-actions">
          <Button
            type="default"
            size="small"
            :loading="loading && activeAction === 'refresh'"
            :disabled="loading"
            @click="handleRefresh"
          >
            <RefreshCw :size="16" style="margin-right: 6px" />
            {{ t('dashboard.actions.refresh') }}
          </Button>
        </div>
      </header>

      <OverviewCards
        :metrics="overview.metrics"
        :setup="overview.setup"
        :loading="loading && !loadedOnce"
      />

      <section class="dashboard-panels">
        <RiskAlertsPanel :risks="overview.risks" :loading="loading && !loadedOnce" />
        <JobRunsPanel :items="jobRuns" :total="jobRunsTotal" :loading="loading && !loadedOnce" />
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Button from '../components/ui/button/Button.vue'
import OverviewCards from '../components/dashboard/OverviewCards.vue'
import RiskAlertsPanel from '../components/dashboard/RiskAlertsPanel.vue'
import JobRunsPanel from '../components/dashboard/JobRunsPanel.vue'
import { useMessage } from '../composables/useMessage'

const message = useMessage()
const { t } = useI18n({ useScope: 'global' })

const defaultOverview = () => ({
  metrics: {
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    totalFiles: 0,
    usedSpace: 0,
    usedSpaceFormatted: '0 B',
    expiringThisWeek: 0,
    pendingDeleteQueue: 0,
  },
  setup: {
    configCount: 0,
    defaultConfigId: null,
    hasUploadConfig: false,
  },
  risks: [],
})

const overview = ref(defaultOverview())
const jobRuns = ref([])
const jobRunsTotal = ref(0)
const loading = ref(false)
const loadedOnce = ref(false)
const activeAction = ref('')

const normalizeOverview = (payload) => ({
  metrics: {
    ...defaultOverview().metrics,
    ...(payload?.metrics || {}),
  },
  setup: {
    ...defaultOverview().setup,
    ...(payload?.setup || {}),
  },
  risks: Array.isArray(payload?.risks) ? payload.risks : [],
})

const loadDashboard = async ({ source = 'init' } = {}) => {
  if (loading.value) return

  loading.value = true
  activeAction.value = source

  try {
    const [overviewResult, jobRunsResult] = await Promise.all([
      api.getAdminOverview(),
      api.getAdminJobRuns({ page: 1, limit: 10 }),
    ])

    overview.value = normalizeOverview(overviewResult)
    jobRuns.value = Array.isArray(jobRunsResult?.items) ? jobRunsResult.items : []
    jobRunsTotal.value = Number(jobRunsResult?.total || 0)
    loadedOnce.value = true
  } catch (error) {
    message.error(error.response?.data?.error || t('dashboard.messages.loadFailed'))
  } finally {
    loading.value = false
    activeAction.value = ''
  }
}

const handleRefresh = () => loadDashboard({ source: 'refresh' })

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.dashboard-title-group {
  min-width: 0;
}

.dashboard-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.dashboard-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.dashboard-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
}

.dashboard-panels {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: var(--nb-space-lg);
  align-items: start;
}

@media (max-width: 1080px) {
  .dashboard-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-actions {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
