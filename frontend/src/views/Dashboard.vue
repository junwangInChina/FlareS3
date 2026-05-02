<template>
  <AppLayout>
    <div class="dashboard-page">
      <header class="dashboard-header">
        <div class="dashboard-title-group">
          <div class="dashboard-title-row">
            <h1 class="dashboard-title">{{ t('dashboard.title') }}</h1>
            <Button
              type="ghost"
              size="small"
              class="dashboard-mobile-refresh-btn"
              :loading="loading && activeAction === 'refresh'"
              :disabled="loading"
              :aria-label="t('dashboard.actions.refresh')"
              @click="handleRefresh"
            >
              <RefreshCw :size="18" />
            </Button>
          </div>
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

      <PageSkeleton v-if="initialPageLoading" variant="dashboard" />

      <template v-else>
        <OverviewCards :metrics="overview.metrics" :setup="overview.setup" />

        <DashboardInsights :metrics="overview.metrics" :setup="overview.setup" />
      </template>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Button from '../components/ui/button/Button.vue'
import PageSkeleton from '../components/ui/skeleton/PageSkeleton.vue'
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
const initialPageLoading = computed(() => loading.value && !loadedOnce.value)

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

.dashboard-title-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.dashboard-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.dashboard-mobile-refresh-btn {
  display: none;
  height: 32px;
  padding: 0 10px;
  align-items: center;
  justify-content: center;
}

.dashboard-mobile-refresh-btn :deep(svg) {
  width: 18px;
  height: 18px;
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

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-title-group,
  .dashboard-title-row,
  .dashboard-subtitle {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .dashboard-title-row {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .dashboard-mobile-refresh-btn {
    display: inline-flex;
    flex-shrink: 0;
  }

  .dashboard-actions {
    display: none;
  }
}
</style>
