<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../ui/card/Card.vue'
import Alert from '../ui/alert/Alert.vue'

const props = defineProps({
  risks: { type: Array, default: () => [] },
  loading: Boolean,
})

const { t } = useI18n({ useScope: 'global' })

const alertItems = computed(() =>
  (props.risks || []).map((risk) => {
    if (risk?.code === 'missing_default_upload_config') {
      return {
        key: risk.code,
        type: 'warning',
        title: t('dashboard.risks.codes.missing_default_upload_config.title'),
        content: t('dashboard.risks.codes.missing_default_upload_config.description'),
      }
    }

    if (risk?.code === 'scheduled_job_failed') {
      return {
        key: `${risk.code}:${risk.jobName || ''}`,
        type: 'error',
        title: t('dashboard.risks.codes.scheduled_job_failed.title'),
        content: t('dashboard.risks.codes.scheduled_job_failed.description', {
          jobName: risk.jobName || '-',
        }),
      }
    }

    return {
      key: String(risk?.code || risk?.message || 'unknown-risk'),
      type: risk?.severity === 'error' ? 'error' : 'warning',
      title: risk?.message || t('dashboard.risks.codes.unknown.title'),
      content: t('dashboard.risks.codes.unknown.description'),
    }
  })
)
</script>

<template>
  <Card class="risk-panel">
    <template #header>
      <div class="panel-header">
        <div class="panel-title">{{ t('dashboard.risks.title') }}</div>
      </div>
    </template>

    <div class="risk-list">
      <Alert
        v-if="loading && !alertItems.length"
        type="info"
        :title="t('dashboard.state.loadingTitle')"
      >
        {{ t('dashboard.state.loadingContent') }}
      </Alert>

      <template v-else-if="alertItems.length">
        <Alert
          v-for="item in alertItems"
          :key="item.key"
          :type="item.type"
          :title="item.title"
          class="risk-alert"
        >
          {{ item.content }}
        </Alert>
      </template>

      <Alert v-else type="success" :title="t('dashboard.risks.okTitle')">
        {{ t('dashboard.risks.okContent') }}
      </Alert>
    </div>
  </Card>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
}

.panel-title {
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-size: 18px;
  font-weight: var(--nb-heading-font-weight, 900);
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.risk-alert {
  width: 100%;
}
</style>
