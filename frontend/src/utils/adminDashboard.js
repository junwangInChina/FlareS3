function normalizeNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function trimDecimal(value) {
  return value.replace(/\.0$/, '')
}

export function getOverviewDisplayValue(value, { loading = false, fallback = '0' } = {}) {
  if (loading) return '—'
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

export function getUploadConfigMetric(setup, { loading = false, t }) {
  const configCount = Number(setup?.configCount || 0)
  const defaultConfigId = String(setup?.defaultConfigId || '').trim()

  if (!setup?.hasUploadConfig) {
    return {
      key: 'uploadConfig',
      label: t('dashboard.cards.uploadConfig'),
      value: getOverviewDisplayValue(configCount, { loading }),
      tagType: 'warning',
      tagLabel: t('dashboard.cards.uploadConfigMissing'),
      hint: t('dashboard.cards.uploadConfigMissingHint'),
    }
  }

  if (!defaultConfigId) {
    return {
      key: 'uploadConfig',
      label: t('dashboard.cards.uploadConfig'),
      value: getOverviewDisplayValue(configCount, { loading }),
      tagType: 'warning',
      tagLabel: t('dashboard.cards.uploadConfigPendingDefault'),
      hint: t('dashboard.cards.uploadConfigPendingDefaultHint', { count: configCount }),
    }
  }

  return {
    key: 'uploadConfig',
    label: t('dashboard.cards.uploadConfig'),
    value: getOverviewDisplayValue(configCount, { loading }),
    tagType: 'success',
    tagLabel: t('dashboard.cards.uploadConfigReady'),
    hint: t('dashboard.cards.uploadConfigReadyHint', {
      count: configCount,
      defaultConfigId,
    }),
  }
}

export function buildOverviewCardsModel({ metrics = {}, setup = {}, loading = false, t }) {
  const uploadConfigMetric = getUploadConfigMetric(setup, { loading, t })

  return [
    {
      key: 'users',
      label: t('dashboard.cards.users'),
      hint: t('dashboard.cards.usersHint'),
      metrics: [
        {
          key: 'totalUsers',
          label: t('dashboard.cards.totalUsers'),
          value: getOverviewDisplayValue(metrics?.totalUsers, { loading }),
        },
        {
          key: 'activeUsers',
          label: t('dashboard.cards.activeUsers'),
          value: getOverviewDisplayValue(metrics?.activeUsers, { loading }),
        },
      ],
    },
    {
      key: 'files',
      label: t('dashboard.cards.files'),
      hint: t('dashboard.cards.filesHint'),
      metrics: [
        {
          key: 'totalFiles',
          label: t('dashboard.cards.totalFiles'),
          value: getOverviewDisplayValue(metrics?.totalFiles, { loading }),
        },
        {
          key: 'expiringThisWeek',
          label: t('dashboard.cards.expiringThisWeek'),
          value: getOverviewDisplayValue(metrics?.expiringThisWeek, { loading }),
        },
      ],
    },
    {
      key: 'storage',
      label: t('dashboard.cards.storage'),
      hint: uploadConfigMetric.hint,
      metrics: [
        {
          key: 'usedSpace',
          label: t('dashboard.cards.usedSpace'),
          value: getOverviewDisplayValue(metrics?.usedSpaceFormatted, {
            loading,
            fallback: '0 B',
          }),
        },
        {
          key: uploadConfigMetric.key,
          label: uploadConfigMetric.label,
          value: uploadConfigMetric.value,
          tagLabel: uploadConfigMetric.tagLabel,
          tagType: uploadConfigMetric.tagType,
        },
      ],
    },
    {
      key: 'pendingDeleteQueue',
      label: t('dashboard.cards.pendingDeleteQueue'),
      value: getOverviewDisplayValue(metrics?.pendingDeleteQueue, { loading }),
      hint: t('dashboard.cards.pendingDeleteQueueHint'),
    },
  ]
}

export function getJobRunStatusTagType(status) {
  if (status === 'success') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'info'
  return 'default'
}

export function formatJobRunDuration(durationMs) {
  const duration = Math.max(0, normalizeNumber(durationMs))

  if (duration < 1000) {
    return `${Math.round(duration)} ms`
  }

  if (duration < 60_000) {
    return `${trimDecimal((Math.round((duration / 1000) * 10) / 10).toFixed(1))} s`
  }

  let minutes = Math.floor(duration / 60_000)
  let seconds = Math.round((duration % 60_000) / 1000)

  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }

  return `${minutes}m ${seconds}s`
}

export function listJobRunSummaryEntries(summary) {
  if (!summary || typeof summary !== 'object') {
    return []
  }

  return Object.entries(summary)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
}
