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

      <DashboardInsights
        :metrics="overview.metrics"
        :setup="overview.setup"
        :loading="loading && !loadedOnce"
      />
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
import DashboardInsights from '../components/dashboard/DashboardInsights.vue'
import OverviewCards from '../components/dashboard/OverviewCards.vue'
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
    totalTexts: 0,
    textsUpdated7d: 0,
    textsUpdated8To30d: 0,
    textsStaleOver30d: 0,
    activeShares: 0,
    expiredShares: 0,
    exhaustedShares: 0,
    consumedShares: 0,
  },
  setup: {
    configCount: 0,
    defaultConfigId: null,
    hasUploadConfig: false,
  },
})

const overview = ref(defaultOverview())
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
})

const loadDashboard = async ({ source = 'init' } = {}) => {
  if (loading.value) return

  loading.value = true
  activeAction.value = source

  try {
    const overviewResult = await api.getAdminOverview()
    overview.value = normalizeOverview(overviewResult)
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
