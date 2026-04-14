<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../ui/card/Card.vue'
import { buildDashboardInsightsModel } from '../../utils/adminDashboard.js'

const props = defineProps({
  metrics: { type: Object, default: () => ({}) },
  setup: { type: Object, default: () => ({}) },
  loading: Boolean,
})

const { t } = useI18n({ useScope: 'global' })
const RING_RADIUS = 44
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const insights = computed(() =>
  buildDashboardInsightsModel({
    metrics: props.metrics,
    setup: props.setup,
    loading: props.loading,
    t,
  })
)

const ringSegments = computed(() => {
  let offset = 0

  return insights.value.userStatus.segments
    .map((segment) => {
      const dashLength = segment.ratio * RING_CIRCUMFERENCE
      const currentOffset = offset
      offset += dashLength

      return {
        ...segment,
        dashLength,
        dashOffset: currentOffset,
      }
    })
    .filter((segment) => segment.dashLength > 0)
})
</script>

<template>
  <section class="dashboard-insights-grid">
    <Card class="dashboard-insights-card dashboard-insights-card--user-status">
      <div class="dashboard-insights-section-header">
        <div class="dashboard-insights-section-title">{{ insights.userStatus.title }}</div>
      </div>

      <div class="user-status-panel">
        <div class="user-status-ring">
          <div class="user-status-ring-shell">
          <svg
            class="user-status-ring-svg"
            viewBox="0 0 120 120"
            role="img"
            :aria-label="insights.userStatus.title"
          >
            <circle class="user-status-ring-track" cx="60" cy="60" r="44" />
            <circle
              v-for="segment in ringSegments"
              :key="segment.key"
              class="user-status-ring-segment"
              :data-tone="segment.tone"
              cx="60"
              cy="60"
              r="44"
              :stroke-dasharray="`${segment.dashLength} ${RING_CIRCUMFERENCE}`"
              :stroke-dashoffset="`${-segment.dashOffset}`"
            />
          </svg>

            <div class="user-status-ring-center">
              <div class="user-status-total-label">{{ insights.userStatus.totalLabel }}</div>
              <div class="user-status-total-value">{{ insights.userStatus.totalValue }}</div>
              <div v-if="insights.userStatus.empty" class="user-status-empty">
                {{ t('dashboard.insights.userStatus.empty') }}
              </div>
            </div>
          </div>
        </div>

        <div class="user-status-summary">
          <div class="user-status-legend">
            <div v-for="segment in insights.userStatus.segments" :key="segment.key" class="user-status-legend-item">
              <div class="user-status-legend-copy">
                <span class="user-status-legend-dot" :data-tone="segment.tone" aria-hidden="true"></span>
                <span class="user-status-legend-label">{{ segment.label }}</span>
              </div>
              <span class="user-status-legend-value">{{ segment.displayValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <Card class="dashboard-insights-card dashboard-insights-card--health">
      <div class="dashboard-insights-section-header">
        <div class="dashboard-insights-section-title">{{ t('dashboard.insights.health.title') }}</div>
      </div>

      <div class="config-health">
        <div class="dashboard-insights-subtitle">{{ insights.configHealth.title }}</div>
        <div class="config-health-steps">
          <div
            v-for="step in insights.configHealth.steps"
            :key="step.key"
            class="config-health-step"
            :data-step="step.key"
            :class="{ 'is-complete': step.complete, 'is-active': step.active }"
          >
            <span class="config-health-step-bar"></span>
            <span class="config-health-step-label">{{ step.label }}</span>
          </div>
        </div>
        <div class="config-health-body">
          <div class="config-health-status-row">
            <div class="config-health-status" :data-tone="insights.configHealth.statusKey">
              {{ insights.configHealth.statusLabel }}
            </div>
            <div class="config-health-value">
              {{ t('dashboard.insights.configHealth.countLabel', { count: insights.configHealth.value }) }}
            </div>
          </div>
          <div class="config-health-hint">{{ insights.configHealth.hint }}</div>
        </div>
      </div>

      <div class="file-alerts">
        <div class="dashboard-insights-subtitle">{{ insights.fileAlerts.title }}</div>
        <div
          v-for="item in insights.fileAlerts.items"
          :key="item.key"
          class="file-alert-item"
          :data-tone="item.tone"
        >
          <div class="file-alert-copy">
            <div class="file-alert-label">{{ item.label }}</div>
          </div>
          <div class="file-alert-value">{{ item.displayValue }}</div>
        </div>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.dashboard-insights-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: var(--nb-space-md);
  align-items: start;
}

.dashboard-insights-card {
  min-width: 0;
}

.dashboard-insights-section-header {
  margin-bottom: var(--nb-space-md);
}

.dashboard-insights-section-title {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-size: 18px;
  font-weight: var(--nb-heading-font-weight, 900);
}

.dashboard-insights-subtitle {
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.user-status-panel {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
  gap: var(--nb-space-lg);
  align-items: center;
}

.user-status-ring {
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-status-ring-shell {
  position: relative;
  width: 100%;
  max-width: 220px;
}

.user-status-ring-svg {
  width: 100%;
  max-width: 220px;
  height: auto;
  transform: rotate(-90deg);
}

.user-status-ring-track {
  fill: none;
  stroke: var(--nb-border, var(--nb-gray-200));
  stroke-width: 12;
}

.user-status-ring-segment {
  fill: none;
  stroke-width: 12;
}

.user-status-ring-segment[data-tone='success'] {
  stroke: var(--nb-success, #16a34a);
}

.user-status-ring-segment[data-tone='danger'] {
  stroke: var(--nb-danger, #dc2626);
}

.user-status-ring-segment[data-tone='muted'] {
  stroke: var(--nb-muted-foreground, var(--nb-gray-400));
}

.user-status-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.user-status-summary {
  min-width: 0;
}

.user-status-total-label {
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
}

.user-status-total-value {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-size: clamp(28px, 4vw, 40px);
  font-weight: var(--nb-heading-font-weight, 900);
  line-height: 1;
}

.user-status-empty {
  margin-top: 6px;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
}

.user-status-legend {
  display: grid;
  gap: 8px;
}

.user-status-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.user-status-legend-copy {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-status-legend-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--nb-border, var(--nb-gray-200));
}

.user-status-legend-dot[data-tone='success'] {
  background: var(--nb-success, #16a34a);
}

.user-status-legend-dot[data-tone='danger'] {
  background: var(--nb-danger, #dc2626);
}

.user-status-legend-dot[data-tone='muted'] {
  background: var(--nb-muted-foreground, var(--nb-gray-400));
}

.user-status-legend-label {
  min-width: 0;
}

.user-status-legend-value {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: 800;
}

.config-health {
  display: grid;
  gap: 12px;
}

.config-health-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.config-health-step {
  display: grid;
  gap: 6px;
}

.config-health-step-bar {
  min-height: 8px;
  border-radius: 999px;
  background: var(--nb-border, var(--nb-gray-200));
}

.config-health-step.is-active .config-health-step-bar {
  background: var(--nb-warning, #f59e0b);
}

.config-health-step.is-complete .config-health-step-bar {
  background: var(--nb-success, #16a34a);
}

.config-health-step-label {
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 11px;
}

.config-health-body {
  display: grid;
  gap: 8px;
}

.config-health-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.config-health-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--nb-border, var(--nb-gray-200));
}

.config-health-status[data-tone='ready'] {
  color: var(--nb-success, #16a34a);
  background: color-mix(in srgb, var(--nb-success, #16a34a) 12%, transparent);
}

.config-health-status[data-tone='pendingDefault'] {
  color: var(--nb-warning, #f59e0b);
  background: color-mix(in srgb, var(--nb-warning, #f59e0b) 14%, transparent);
}

.config-health-status[data-tone='missing'] {
  color: var(--nb-danger, #dc2626);
  background: color-mix(in srgb, var(--nb-danger, #dc2626) 12%, transparent);
}

.config-health-value {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-size: 13px;
  font-weight: 800;
}

.config-health-hint {
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
  line-height: 1.5;
}

.file-alerts {
  display: grid;
  gap: 12px;
  margin-top: var(--nb-space-lg);
}

.file-alert-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--nb-border, var(--nb-gray-200));
  border-radius: 16px;
}

.file-alert-item[data-tone='warning'] {
  border-color: color-mix(in srgb, var(--nb-warning, #f59e0b) 26%, var(--nb-border, var(--nb-gray-200)));
}

.file-alert-item[data-tone='info'] {
  border-color: color-mix(in srgb, var(--nb-info, #2563eb) 22%, var(--nb-border, var(--nb-gray-200)));
}

.file-alert-copy {
  min-width: 0;
}

.file-alert-label {
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 12px;
}

.file-alert-value {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-size: 20px;
  font-weight: 900;
}

@media (max-width: 720px) {
  .dashboard-insights-grid {
    grid-template-columns: 1fr;
  }

  .user-status-panel {
    grid-template-columns: 1fr;
  }

  .config-health-status-row,
  .file-alert-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
