<template>
  <header class="shares-header">
    <div class="shares-title-group">
      <h1 class="shares-title">{{ t('shares.title') }}</h1>
      <p class="shares-subtitle">{{ t('shares.subtitle') }}</p>
    </div>

    <div class="shares-actions">
      <div class="filter-row" :class="{ 'has-owner-filter': isAdmin }">
        <div class="filter-item query">
          <Input
            :model-value="filters.q"
            :placeholder="t('shares.filters.q')"
            size="small"
            clearable
            @update:model-value="updateFilter('q', $event)"
            @keyup.enter="emit('search')"
          />
        </div>

        <div class="filter-item type">
          <Select
            :model-value="filters.type"
            :options="typeOptions"
            size="small"
            @update:model-value="updateFilter('type', $event)"
          />
        </div>

        <div class="filter-item status">
          <Select
            :model-value="filters.status"
            :options="statusOptions"
            size="small"
            @update:model-value="updateFilter('status', $event)"
          />
        </div>

        <div class="filter-item sort">
          <Select
            :model-value="filters.sort_key"
            :options="sortOptions"
            size="small"
            @update:model-value="updateFilter('sort_key', $event)"
          />
        </div>

        <div class="filter-item expires-range">
          <DateRangePicker
            :start-value="filters.expires_from_date"
            :end-value="filters.expires_to_date"
            :placeholder="t('shares.filters.expiresAt')"
            size="small"
            clearable
            @update:start-value="updateFilter('expires_from_date', $event)"
            @update:end-value="updateFilter('expires_to_date', $event)"
          />
        </div>

        <div v-if="isAdmin" class="filter-item owner">
          <Input
            :model-value="ownerSearchQuery"
            :placeholder="t('shares.filters.ownerSearch')"
            size="small"
            clearable
            :disabled="ownersLoading"
            @update:model-value="emit('update-owner-search-query', $event)"
          />
        </div>

        <div v-if="isAdmin" class="filter-item owner-select">
          <Select
            :model-value="filters.owner_id"
            :options="ownerOptions"
            size="small"
            :disabled="ownersLoading"
            @update:model-value="updateFilter('owner_id', $event)"
          />
        </div>

        <Button
          type="default"
          size="small"
          class="shares-search-btn"
          :loading="loading && activeAction === 'search'"
          :disabled="loading || batchDisableSubmitting"
          @click="emit('search')"
        >
          <Search :size="16" style="margin-right: 6px" />
          {{ t('common.search') }}
        </Button>

        <Button
          type="default"
          size="small"
          class="shares-refresh-btn"
          :loading="loading && activeAction === 'refresh'"
          :disabled="loading || batchDisableSubmitting"
          @click="emit('refresh')"
        >
          <RefreshCw :size="16" style="margin-right: 6px" />
          {{ t('common.refresh') }}
        </Button>

        <Button
          type="ghost"
          size="small"
          class="shares-quick-btn shares-expired-btn"
          :class="{ 'is-active': expiredGovernanceActive }"
          :loading="loading && activeAction === 'focus-expired'"
          :disabled="loading || batchDisableSubmitting"
          @click="emit('focus-expired')"
        >
          {{ t('shares.actions.focusExpired') }}
        </Button>

        <Button
          type="ghost"
          size="small"
          class="shares-quick-btn shares-expiring-btn"
          :class="{ 'is-active': expiringGovernanceActive }"
          :loading="loading && activeAction === 'focus-expiring'"
          :disabled="loading || batchDisableSubmitting"
          @click="emit('focus-expiring')"
        >
          {{ t('shares.actions.focusExpiring') }}
        </Button>

        <Button
          type="danger"
          size="small"
          class="shares-batch-disable-btn"
          :loading="batchDisableSubmitting"
          :disabled="loading || batchDisableSubmitting || selectedSharesCount === 0"
          @click="emit('batch-disable')"
        >
          <Trash2 :size="16" style="margin-right: 6px" />
          {{ t('shares.actions.disableSelected', { count: selectedSharesCount }) }}
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RefreshCw, Search, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import DateRangePicker from '../ui/date-range-picker/DateRangePicker.vue'
import Input from '../ui/input/Input.vue'
import Select from '../ui/select/Select.vue'

defineProps({
  filters: {
    type: Object,
    required: true,
  },
  ownerSearchQuery: {
    type: String,
    default: '',
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  ownersLoading: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  activeAction: {
    type: String,
    default: '',
  },
  batchDisableSubmitting: {
    type: Boolean,
    default: false,
  },
  expiredGovernanceActive: {
    type: Boolean,
    default: false,
  },
  expiringGovernanceActive: {
    type: Boolean,
    default: false,
  },
  selectedSharesCount: {
    type: Number,
    default: 0,
  },
  typeOptions: {
    type: Array,
    default: () => [],
  },
  statusOptions: {
    type: Array,
    default: () => [],
  },
  sortOptions: {
    type: Array,
    default: () => [],
  },
  ownerOptions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'update-filter',
  'update-owner-search-query',
  'search',
  'refresh',
  'focus-expired',
  'focus-expiring',
  'batch-disable',
])

const { t } = useI18n({ useScope: 'global' })

const updateFilter = (key, value) => {
  emit('update-filter', { key, value })
}
</script>

<style scoped>
.shares-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.shares-title-group {
  min-width: 0;
}

.shares-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.shares-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.shares-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.filter-item.type {
  width: 150px;
}

.filter-item.query {
  width: 220px;
}

.filter-item.status {
  width: 120px;
}

.filter-item.sort {
  width: 160px;
}

.filter-item.expires-range {
  width: 240px;
}

.filter-item.owner {
  width: 180px;
}

.filter-item.owner-select {
  width: 160px;
}

.shares-quick-btn.is-active {
  background: var(--nb-secondary);
  border-color: var(--nb-border-color);
}

:root[data-ui-theme='shadcn'] .shares-quick-btn.is-active {
  background: var(--accent);
}

@media (max-width: 768px) {
  .shares-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .shares-title-group,
  .shares-subtitle,
  .shares-actions,
  .shares-header,
  .filter-row {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .shares-actions {
    justify-content: flex-start;
    align-items: stretch;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-flow: row;
    justify-content: flex-start;
    align-items: stretch;
    gap: var(--nb-space-sm);
  }

  .filter-item.query,
  .filter-item.owner,
  .filter-item.type,
  .filter-item.status,
  .filter-item.owner-select,
  .filter-item.sort,
  .filter-item.expires-range,
  .shares-search-btn,
  .shares-refresh-btn,
  .shares-expired-btn,
  .shares-expiring-btn,
  .shares-batch-disable-btn {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .filter-item.query {
    grid-column: 1 / span 2;
    grid-row: 1;
  }

  .filter-item.owner {
    grid-column: 3 / span 2;
    grid-row: 1;
  }

  .filter-row:not(.has-owner-filter) .filter-item.query {
    grid-column: 1 / -1;
  }

  .filter-item.type {
    grid-column: 1;
    grid-row: 2;
  }

  .filter-item.status {
    grid-column: 2;
    grid-row: 2;
  }

  .filter-item.owner-select {
    grid-column: 3;
    grid-row: 2;
  }

  .filter-item.sort {
    grid-column: 4;
    grid-row: 2;
  }

  .filter-row:not(.has-owner-filter) .filter-item.sort {
    grid-column: 3 / -1;
  }

  .filter-item.expires-range {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .shares-expired-btn {
    grid-column: 1 / span 2;
    grid-row: 4;
  }

  .shares-expiring-btn {
    grid-column: 3 / span 2;
    grid-row: 4;
  }

  .shares-search-btn {
    grid-column: 1;
    grid-row: 5;
  }

  .shares-refresh-btn {
    grid-column: 2;
    grid-row: 5;
  }

  .shares-batch-disable-btn {
    grid-column: 3 / -1;
    grid-row: 5;
  }

  .shares-search-btn,
  .shares-refresh-btn,
  .shares-expired-btn,
  .shares-expiring-btn,
  .shares-batch-disable-btn {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .filter-row :deep(.brutal-input-wrapper),
  .filter-row :deep(.shadcn-input-wrapper),
  .filter-row :deep(.brutal-select-wrapper),
  .filter-row :deep(.shadcn-select-wrapper),
  .filter-row :deep(.date-range-picker),
  .filter-row :deep(.brutal-input-control),
  .filter-row :deep(.shadcn-input-control),
  .filter-row :deep(.brutal-select-trigger),
  .filter-row :deep(.shadcn-select-trigger),
  .filter-row :deep(.date-range-trigger) {
    width: 100%;
    min-width: 0;
    min-inline-size: 0;
    max-width: 100%;
    overflow: hidden;
  }
}
</style>
