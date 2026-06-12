<template>
  <header class="mount-header">
    <div class="mount-title-group">
      <div class="mount-title-row">
        <h1 class="mount-title">{{ t('mount.title') }}</h1>
      </div>
      <p class="mount-subtitle">{{ t('mount.subtitle') }}</p>
    </div>

    <div class="mount-actions">
      <div class="filter-row">
        <div class="filter-item owner">
          <Select
            :model-value="selectedConfigId"
            :options="configOptions"
            size="small"
            :disabled="configsLoading || !configOptions.length"
            :placeholder="t('mount.state.noConfigSelectedTitle')"
            @update:model-value="emitSelectedConfigId"
          />
        </div>

        <div class="filter-item query">
          <Input
            :model-value="prefixInput"
            :placeholder="t('mount.filters.prefix')"
            size="small"
            clearable
            :disabled="loading || !selectedConfigId"
            @update:model-value="emitPrefixInput"
            @keyup.enter="emit('apply-prefix')"
          />
        </div>

        <Button
          type="default"
          size="small"
          class="mount-action-btn"
          :block="isMobile"
          :disabled="loading || !selectedConfigId"
          @click="emit('apply-prefix')"
        >
          <Search :size="16" style="margin-right: 6px" />
          {{ t('mount.actions.go') }}
        </Button>

        <Button
          type="default"
          size="small"
          class="mount-action-btn"
          :block="isMobile"
          :loading="loading && activeAction === 'refresh'"
          :disabled="loading || !selectedConfigId"
          @click="emit('refresh')"
        >
          <RefreshCw :size="16" style="margin-right: 6px" />
          {{ t('common.refresh') }}
        </Button>

        <Button
          type="primary"
          size="small"
          class="mount-action-btn"
          :block="isMobile"
          :disabled="loading || uploading || !selectedConfigId"
          @click="triggerUploadFile"
        >
          <Upload :size="16" style="margin-right: 6px" />
          {{ t('mount.actions.upload') }}
        </Button>
        <input
          ref="uploadFileInput"
          type="file"
          style="display: none"
          @change="emit('upload-file-change', $event)"
        />

        <Button
          type="default"
          size="small"
          class="mount-action-btn"
          :block="isMobile"
          :disabled="loading || !selectedConfigId"
          @click="emit('show-new-folder')"
        >
          <FolderPlus :size="16" style="margin-right: 6px" />
          {{ t('mount.actions.newFolder') }}
        </Button>

        <div v-if="!isMobile" class="filter-item view-mode">
          <div class="view-mode-toggle" role="group" :aria-label="t('mount.viewMode.ariaLabel')">
            <Tooltip :content="t('mount.viewMode.table')">
              <Button
                type="ghost"
                size="small"
                class="view-mode-btn"
                :class="{ 'is-active': viewMode === 'table' }"
                :disabled="loading || !selectedConfigId"
                :aria-label="t('mount.viewMode.table')"
                @click="emit('set-view-mode', 'table')"
              >
                <Table2 :size="18" />
              </Button>
            </Tooltip>
            <Tooltip :content="t('mount.viewMode.card')">
              <Button
                type="ghost"
                size="small"
                class="view-mode-btn"
                :class="{ 'is-active': viewMode === 'card' }"
                :disabled="loading || !selectedConfigId"
                :aria-label="t('mount.viewMode.card')"
                @click="emit('set-view-mode', 'card')"
              >
                <LayoutGrid :size="18" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { FolderPlus, LayoutGrid, RefreshCw, Search, Table2, Upload } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import Input from '../ui/input/Input.vue'
import Select from '../ui/select/Select.vue'
import Tooltip from '../ui/tooltip/Tooltip.vue'

const props = defineProps({
  selectedConfigId: {
    type: String,
    default: '',
  },
  prefixInput: {
    type: String,
    default: '',
  },
  configOptions: {
    type: Array,
    default: () => [],
  },
  configsLoading: {
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
  uploading: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  viewMode: {
    type: String,
    default: 'table',
  },
})

const emit = defineEmits([
  'update:selectedConfigId',
  'update:prefixInput',
  'apply-prefix',
  'refresh',
  'upload-file-change',
  'show-new-folder',
  'set-view-mode',
])

const { t } = useI18n({ useScope: 'global' })
const uploadFileInput = ref(null)

const emitSelectedConfigId = (value) => {
  emit('update:selectedConfigId', value)
}

const emitPrefixInput = (value) => {
  emit('update:prefixInput', value)
}

const triggerUploadFile = () => {
  if (props.loading || props.uploading || !props.selectedConfigId) return
  const input = uploadFileInput.value
  if (!input) return

  input.value = ''
  input.click()
}
</script>

<style scoped>
.mount-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-lg);
}

.mount-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--nb-space-sm);
  flex-wrap: wrap;
}

.mount-title {
  margin: 0;
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  font-size: var(--nb-font-size-2xl);
  line-height: 1.2;
}

.mount-subtitle {
  margin: 6px 0 0;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  font-size: 0.95rem;
}

.filter-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.filter-item.query {
  width: 180px;
}

.filter-item.owner {
  width: 160px;
}

.filter-item.view-mode {
  display: flex;
  align-items: center;
}

.mount-action-btn {
  flex-shrink: 0;
}

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

:root[data-ui-theme='shadcn'] .view-mode-toggle {
  border: 1px solid var(--border);
  background: var(--background);
}

.view-mode-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.view-mode-btn.is-active {
  background: var(--nb-secondary);
  border-color: var(--nb-border-color);
}

:root[data-ui-theme='shadcn'] .view-mode-btn.is-active {
  background: var(--accent);
}

@media (max-width: 768px) {
  .mount-title-group,
  .mount-title-row,
  .mount-subtitle,
  .mount-header,
  .mount-actions,
  .filter-row {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .mount-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .mount-actions {
    justify-content: flex-start;
    align-items: stretch;
    width: 100%;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    justify-content: flex-start;
  }

  .filter-item.query,
  .filter-item.owner,
  .mount-action-btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
