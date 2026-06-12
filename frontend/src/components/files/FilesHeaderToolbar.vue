<template>
  <header class="files-header">
    <div class="files-title-group">
      <div class="files-title-row">
        <h1 class="files-title">{{ t('files.title') }}</h1>
        <Button
          type="ghost"
          size="small"
          class="files-upload-btn"
          :aria-label="t('files.uploadFile')"
          @click="emit('upload')"
        >
          <Upload :size="18" />
        </Button>
      </div>
      <p class="files-subtitle">
        {{ t('files.subtitle') }}
      </p>
    </div>

    <div class="files-actions">
      <div class="filter-row main">
        <div class="filter-item filename">
          <Input
            :model-value="filters.filename"
            :placeholder="t('files.filters.filename')"
            size="small"
            clearable
            @update:model-value="updateFilter('filename', $event)"
            @keyup.enter="emit('search')"
          />
        </div>

        <div class="filter-item mode-toggle">
          <div class="files-mode-toggle" role="group" :aria-label="t('files.filters.mode')">
            <Button
              type="ghost"
              size="small"
              class="files-mode-btn"
              :class="{ 'is-active': !isTrashMode }"
              :disabled="loading || deleting"
              :aria-label="t('files.filters.activeFiles')"
              @click="emit('set-files-mode', 'active')"
            >
              {{ t('files.filters.activeFiles') }}
            </Button>
            <Button
              type="ghost"
              size="small"
              class="files-mode-btn"
              :class="{ 'is-active': isTrashMode }"
              :disabled="loading || deleting"
              :aria-label="t('files.filters.trashFiles')"
              @click="emit('set-files-mode', 'trash')"
            >
              {{ t('files.filters.trashFiles') }}
            </Button>
          </div>
        </div>

        <div class="filter-item created-range">
          <DateRangePicker
            :start-value="filters.created_from_date"
            :end-value="filters.created_to_date"
            size="small"
            clearable
            @update:start-value="updateFilter('created_from_date', $event)"
            @update:end-value="updateFilter('created_to_date', $event)"
          />
        </div>

        <Button
          type="default"
          size="small"
          class="files-search-btn"
          :block="isMobile"
          :loading="loading && activeAction === 'search'"
          :disabled="loading || deleting"
          @click="emit('search')"
        >
          <Search :size="16" style="margin-right: 6px" />
          {{ t('common.search') }}
        </Button>
        <Button
          type="default"
          size="small"
          class="files-refresh-btn"
          :block="isMobile"
          :loading="loading && activeAction === 'refresh'"
          :disabled="loading || deleting"
          @click="emit('refresh')"
        >
          <RefreshCw :size="16" style="margin-right: 6px" />
          {{ t('common.refresh') }}
        </Button>

        <Button
          v-if="isTrashMode"
          type="danger"
          size="small"
          class="files-clear-trash-btn"
          :block="isMobile"
          :loading="deleting && pendingDeleteMode === 'clearTrash'"
          :disabled="loading || deleting || total <= 0"
          @click="emit('clear-trash')"
        >
          <Trash :size="16" style="margin-right: 6px" />
          {{ t('files.actions.clearTrash') }}
        </Button>

        <Tooltip
          :content="
            showAdvancedFilters ? t('files.filters.lessFilters') : t('files.filters.moreFilters')
          "
        >
          <Button
            type="ghost"
            size="small"
            class="advanced-filters-btn"
            :block="isMobile"
            :class="{ 'is-active': showAdvancedFilters || hasAdvancedFiltersActive }"
            :disabled="loading || deleting"
            :aria-label="
              showAdvancedFilters ? t('files.filters.lessFilters') : t('files.filters.moreFilters')
            "
            @click="emit('toggle-advanced-filters')"
          >
            <SlidersHorizontal :size="18" />
          </Button>
        </Tooltip>

        <div v-if="!isMobile" class="filter-item view-mode">
          <div class="view-mode-toggle" role="group" aria-label="View mode">
            <Tooltip :content="t('files.viewMode.table')">
              <Button
                type="ghost"
                size="small"
                class="view-mode-btn"
                :class="{ 'is-active': viewMode === 'table' }"
                :disabled="loading || deleting"
                :aria-label="t('files.viewMode.table')"
                @click="emit('set-view-mode', 'table')"
              >
                <Table2 :size="18" />
              </Button>
            </Tooltip>
            <Tooltip :content="t('files.viewMode.card')">
              <Button
                type="ghost"
                size="small"
                class="view-mode-btn"
                :class="{ 'is-active': viewMode === 'card' }"
                :disabled="loading || deleting"
                :aria-label="t('files.viewMode.card')"
                @click="emit('set-view-mode', 'card')"
              >
                <LayoutGrid :size="18" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div v-if="showAdvancedFilters" class="filter-row advanced">
        <div v-if="isAdmin" class="filter-item owner">
          <Select
            :model-value="filters.owner_id"
            :options="ownerOptions"
            size="small"
            :disabled="usersLoading"
            @update:model-value="updateFilter('owner_id', $event)"
          />
        </div>

        <div v-if="!isTrashMode" class="filter-item status">
          <Select
            :model-value="filters.upload_status"
            :options="statusOptions"
            size="small"
            @update:model-value="updateFilter('upload_status', $event)"
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
      </div>
    </div>
  </header>
</template>

<script setup>
import {
  LayoutGrid,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table2,
  Trash,
  Upload,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import DateRangePicker from '../ui/date-range-picker/DateRangePicker.vue'
import Input from '../ui/input/Input.vue'
import Select from '../ui/select/Select.vue'
import Tooltip from '../ui/tooltip/Tooltip.vue'

defineProps({
  filters: {
    type: Object,
    required: true,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  isTrashMode: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  deleting: {
    type: Boolean,
    default: false,
  },
  activeAction: {
    type: String,
    default: '',
  },
  pendingDeleteMode: {
    type: String,
    default: 'soft',
  },
  total: {
    type: [Number, String],
    default: 0,
  },
  showAdvancedFilters: {
    type: Boolean,
    default: false,
  },
  hasAdvancedFiltersActive: {
    type: Boolean,
    default: false,
  },
  usersLoading: {
    type: Boolean,
    default: false,
  },
  ownerOptions: {
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
  viewMode: {
    type: String,
    default: 'table',
  },
})

const emit = defineEmits([
  'upload',
  'search',
  'refresh',
  'clear-trash',
  'toggle-advanced-filters',
  'set-files-mode',
  'set-view-mode',
  'update-filter',
])

const { t } = useI18n({ useScope: 'global' })

const updateFilter = (key, value) => {
  emit('update-filter', { key, value })
}
</script>

<style scoped>
.files-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.files-title-group {
  min-width: 0;
}

.files-title-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.files-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.files-upload-btn {
  padding: 0 10px;
  height: 32px;
}

.files-upload-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.files-subtitle {
  margin: var(--nb-space-sm) 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: var(--nb-font-size-sm);
}

.files-actions {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
  align-items: flex-end;
}

.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
  justify-content: flex-end;
}

.filter-row.main {
  align-self: stretch;
  justify-content: flex-start;
  flex-wrap: nowrap;
  max-width: 100%;
  overflow-x: auto;
}

.filter-row.advanced {
  align-self: stretch;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.filter-item.filename {
  width: 160px;
}

.filter-item.owner {
  width: 140px;
}

.filter-item.status {
  width: 120px;
}

.filter-item.sort {
  width: 140px;
}

.filter-item.created-range {
  width: 280px;
}

.filter-item.mode-toggle,
.filter-item.view-mode {
  display: flex;
  align-items: center;
}

.files-mode-toggle,
.view-mode-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: var(--nb-border);
  border-radius: var(--nb-radius-md, var(--nb-radius));
  background: var(--nb-surface);
  height: 36px;
  align-items: center;
}

:root[data-ui-theme='shadcn'] .files-mode-toggle,
:root[data-ui-theme='shadcn'] .view-mode-toggle {
  border: 1px solid var(--border);
  background: var(--background);
}

.files-mode-btn {
  height: 32px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.view-mode-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.files-mode-btn.is-active,
.view-mode-btn.is-active {
  background: var(--nb-secondary);
  border-color: var(--nb-border-color);
}

.advanced-filters-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.advanced-filters-btn.is-active {
  background: var(--nb-secondary);
  border-color: var(--nb-border-color);
}

:root[data-ui-theme='shadcn'] .view-mode-btn.is-active {
  background: var(--accent);
}

:root[data-ui-theme='shadcn'] .advanced-filters-btn.is-active {
  background: var(--accent);
}

@media (max-width: 768px) {
  .files-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .files-title-group,
  .files-title-row,
  .files-subtitle,
  .files-actions,
  .files-header,
  .filter-row,
  .filter-row.main,
  .filter-row.advanced {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .files-actions {
    justify-content: flex-start;
    align-items: stretch;
  }

  .files-title-row {
    flex-wrap: wrap;
  }

  .filter-row {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .filter-row.main {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: var(--nb-space-sm);
    overflow-x: hidden;
  }

  .filter-row.advanced {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: var(--nb-space-sm);
  }

  .filter-row.main > * {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .filter-item.filename,
  .filter-item.mode-toggle,
  .filter-item.created-range {
    grid-column: 1 / -1;
  }

  .filter-row.advanced > *,
  .filter-item.owner,
  .filter-item.status,
  .filter-item.sort,
  .filter-item.view-mode,
  .files-search-btn,
  .files-refresh-btn {
    width: 100%;
  }

  .files-mode-toggle,
  .view-mode-toggle,
  .advanced-filters-btn {
    width: 100%;
  }

  .filter-item.view-mode {
    display: none !important;
  }

  .files-mode-btn,
  .view-mode-btn {
    flex: 1 1 0;
    min-width: 0;
  }

  .filter-row.main :deep(.tooltip-trigger),
  .filter-row.main :deep(.brutal-tooltip-trigger) {
    grid-column: 3;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .filter-row.main :deep(.brutal-input-wrapper),
  .filter-row.main :deep(.shadcn-input-wrapper),
  .filter-row.main :deep(.brutal-select-wrapper),
  .filter-row.main :deep(.shadcn-select-wrapper),
  .filter-row.main :deep(.date-range-picker),
  .filter-row.main :deep(.brutal-input-control),
  .filter-row.main :deep(.shadcn-input-control),
  .filter-row.main :deep(.brutal-select-trigger),
  .filter-row.main :deep(.shadcn-select-trigger),
  .filter-row.main :deep(.date-range-trigger),
  .filter-row.advanced :deep(.brutal-select-wrapper),
  .filter-row.advanced :deep(.shadcn-select-wrapper),
  .filter-row.advanced :deep(.brutal-select-trigger),
  .filter-row.advanced :deep(.shadcn-select-trigger) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
}
</style>
