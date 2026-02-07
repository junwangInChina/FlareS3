<template>
  <AppLayout>
    <div class="mount-page">
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
                v-model="selectedConfigId"
                :options="configOptions"
                size="small"
                :disabled="configsLoading || !configOptions.length"
                :placeholder="t('mount.state.noConfigSelectedTitle')"
              />
            </div>

            <div class="filter-item query">
              <Input
                v-model="prefixInput"
                :placeholder="t('mount.filters.prefix')"
                size="small"
                clearable
                :disabled="loading || !selectedConfigId"
                @keyup.enter="handleApplyPrefix"
              />
            </div>

            <Button
              type="default"
              size="small"
              :disabled="loading || !selectedConfigId"
              @click="handleApplyPrefix"
            >
              <Search :size="16" style="margin-right: 6px" />
              {{ t('mount.actions.go') }}
            </Button>

            <Button
              type="default"
              size="small"
              :loading="loading && activeAction === 'refresh'"
              :disabled="loading || !selectedConfigId"
              @click="handleRefresh"
            >
              <RefreshCw :size="16" style="margin-right: 6px" />
              {{ t('common.refresh') }}
            </Button>
          </div>
        </div>
      </header>

      <section class="mount-content">
        <Alert
          v-if="!configsLoading && configs.length === 0"
          type="info"
          :title="t('mount.state.noConfigsTitle')"
        >
          {{ t('mount.state.noConfigsContent') }}
        </Alert>

        <Alert
          v-else-if="!configsLoading && !selectedConfigId"
          type="info"
          :title="t('mount.state.noConfigSelectedTitle')"
        >
          {{ t('mount.state.noConfigSelectedContent') }}
        </Alert>

        <Card v-else class="mount-browser-card">
          <template #header>
            <div class="mount-browser-header">
              <div class="mount-path">
                <Button type="ghost" size="small" :disabled="loading || !prefix" @click="goRoot">
                  <Home :size="16" />
                  <span class="btn-label">{{ t('mount.actions.root') }}</span>
                </Button>

                <div class="breadcrumb">
                  <span class="breadcrumb-root" :class="{ clickable: prefix }" @click="goRoot"
                    >/</span
                  >
                  <template v-for="(item, index) in breadcrumbItems" :key="item.prefix">
                    <span v-if="index > 0" class="breadcrumb-sep">/</span>
                    <span class="breadcrumb-item clickable" @click="navigateToPrefix(item.prefix)">
                      {{ item.label }}
                    </span>
                  </template>
                </div>

                <Button type="ghost" size="small" :disabled="loading || !prefix" @click="goUp">
                  <ArrowUp :size="16" />
                  <span class="btn-label">{{ t('mount.actions.up') }}</span>
                </Button>
              </div>
            </div>
          </template>

          <Table :columns="columns" :data="tableData" :loading="loading" />

          <Pagination
            :page="pageNumber"
            :page-size="limit"
            :total="paginationTotal"
            :display-total="paginationDisplayTotal"
            :page-size-options="pageSizeOptions"
            :disabled="loading || !selectedConfigId"
            @update:page="handlePaginationPageChange"
            @update:page-size="handlePaginationPageSizeChange"
          />
        </Card>
      </section>

      <MountedObjectPreviewModal
        v-model:show="previewModalVisible"
        :config-id="selectedConfigId"
        :object-key="previewKey"
      />
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { ArrowUp, Download, Eye, FolderOpen, Home, RefreshCw, Search } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import Card from '../components/ui/card/Card.vue'
import Table from '../components/ui/table/Table.vue'
import Pagination from '../components/ui/pagination/Pagination.vue'
import Select from '../components/ui/select/Select.vue'
import Input from '../components/ui/input/Input.vue'
import Button from '../components/ui/button/Button.vue'
import Tooltip from '../components/ui/tooltip/Tooltip.vue'
import Alert from '../components/ui/alert/Alert.vue'
import { useMessage } from '../composables/useMessage'
import MountedObjectPreviewModal from '../components/mount/MountedObjectPreviewModal.vue'

const { t, locale } = useI18n({ useScope: 'global' })
const message = useMessage()

const configsLoading = ref(false)
const configs = ref([])
const selectedConfigId = ref('')

const prefix = ref('')
const prefixInput = ref('')

const limit = ref(20)
const pageSizeOptions = [10, 20, 50]

const tokenStack = ref([null])
const listResult = ref(null)
const loading = ref(false)
const activeAction = ref('')
const loadRequestSerial = ref(0)

const previewModalVisible = ref(false)
const previewKey = ref('')

const configOptions = computed(() =>
  configs.value.map((row) => ({
    label: `${row.name || row.id} (${row.bucket_name || row.id})`,
    value: row.id,
  }))
)

const currentToken = computed(() => tokenStack.value[tokenStack.value.length - 1] || '')
const pageNumber = computed(() => tokenStack.value.length)
const canPrev = computed(() => tokenStack.value.length > 1)
const canNext = computed(() => Boolean(listResult.value?.next_continuation_token))

const paginationTotal = computed(() => {
  const pageSize = Number(limit.value || 100)
  const pages = pageNumber.value + (canNext.value ? 1 : 0)
  return pageSize * pages
})

const paginationDisplayTotal = computed(() => {
  const pageSize = Number(limit.value || 100)
  const page = pageNumber.value
  const count = Number(listResult.value?.key_count || 0)
  const seen = Math.max(0, (page - 1) * pageSize + count)
  return canNext.value ? `${seen}+` : seen
})

const normalizePrefix = (value) => {
  const raw = String(value || '').trim()
  if (!raw || raw === '/') return ''

  let next = raw
  if (next.startsWith('/')) next = next.slice(1)
  if (next && !next.endsWith('/')) next += '/'
  return next
}

const formatBytes = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '-'
  if (value === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(k)))
  const sized = Math.round((value / Math.pow(k, i)) * 100) / 100
  return `${sized} ${sizes[i]}`
}

const formatDateTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale.value)
}

const getBasename = (key) => {
  const normalized = String(key || '')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

const getFilenameExtension = (filename) => {
  const name = String(filename || '').trim()
  const index = name.lastIndexOf('.')
  if (index <= 0 || index === name.length - 1) return ''
  return name.slice(index + 1).toLowerCase()
}

const isPreviewSupported = (key) => {
  const extension = getFilenameExtension(getBasename(key))
  if (!extension) return false
  if (extension === 'pdf') return true
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return true
  if (extension === 'md' || extension === 'markdown') return true
  if (['txt', 'log', 'csv', 'json', 'yml', 'yaml', 'ini', 'conf'].includes(extension)) return true
  return false
}

const breadcrumbItems = computed(() => {
  const raw = String(prefix.value || '')
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const parts = trimmed.split('/').filter(Boolean)
  const items = []
  let acc = ''
  for (const part of parts) {
    acc += `${part}/`
    items.push({ label: part, prefix: acc })
  }
  return items
})

const goRoot = async () => {
  await navigateToPrefix('')
}

const getParentPrefix = (value) => {
  const raw = String(value || '')
  if (!raw) return ''
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const idx = trimmed.lastIndexOf('/')
  if (idx <= 0) return ''
  return trimmed.slice(0, idx + 1)
}

const goUp = async () => {
  if (!prefix.value) return
  const parent = getParentPrefix(prefix.value)
  await navigateToPrefix(parent)
}

const openFolder = async (folderPrefix) => {
  await navigateToPrefix(String(folderPrefix || ''))
}

const buildDownloadUrl = (key) => {
  const configId = String(selectedConfigId.value || '').trim()
  const objectKey = String(key || '').trim()
  if (!configId || !objectKey) return ''
  const query = `config_id=${encodeURIComponent(configId)}&key=${encodeURIComponent(objectKey)}`
  return `/api/mount/download?${query}`
}

const loadObjects = async () => {
  const configId = String(selectedConfigId.value || '').trim()
  if (!configId) return false

  const requestSerial = ++loadRequestSerial.value
  loading.value = true

  try {
    const result = await api.listMountedObjects({
      configId,
      prefix: prefix.value,
      continuationToken: currentToken.value || undefined,
      limit: Number(limit.value || 100),
    })

    if (requestSerial !== loadRequestSerial.value) return false

    listResult.value = result
    return true
  } catch (error) {
    if (requestSerial === loadRequestSerial.value) {
      message.error(error.response?.data?.error || t('mount.messages.loadObjectsFailed'))
    }
    return false
  } finally {
    if (requestSerial === loadRequestSerial.value) {
      loading.value = false
      activeAction.value = ''
    }
  }
}

const navigateToPrefix = async (value) => {
  if (loading.value) return

  prefix.value = normalizePrefix(value)
  prefixInput.value = prefix.value
  tokenStack.value = [null]
  await loadObjects()
}

const handleApplyPrefix = async () => {
  await navigateToPrefix(prefixInput.value)
}

const handleRefresh = async () => {
  if (loading.value) return
  activeAction.value = 'refresh'
  tokenStack.value = [tokenStack.value[0]]
  await loadObjects()
}

const prevPage = async () => {
  if (loading.value) return
  if (!canPrev.value) return

  const removed = tokenStack.value.pop()
  const ok = await loadObjects()
  if (!ok) {
    tokenStack.value.push(removed)
  }
}

const nextPage = async () => {
  if (loading.value) return
  const nextToken = String(listResult.value?.next_continuation_token || '').trim()
  if (!nextToken) return

  tokenStack.value.push(nextToken)
  const ok = await loadObjects()
  if (!ok) {
    tokenStack.value.pop()
  }
}

const handlePaginationPageChange = async (targetPage) => {
  if (loading.value) return

  const nextPageNumber = Number(targetPage)
  if (!Number.isFinite(nextPageNumber) || nextPageNumber < 1) return

  const currentPageNumber = pageNumber.value
  if (nextPageNumber === currentPageNumber) return

  if (nextPageNumber < currentPageNumber) {
    if (nextPageNumber === currentPageNumber - 1) {
      await prevPage()
      return
    }

    const previousStack = [...tokenStack.value]
    tokenStack.value = tokenStack.value.slice(0, nextPageNumber)
    const ok = await loadObjects()
    if (!ok) {
      tokenStack.value = previousStack
    }
    return
  }

  if (nextPageNumber === currentPageNumber + 1) {
    await nextPage()
  }
}

const handlePaginationPageSizeChange = (value) => {
  const nextSize = Number(value)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  if (nextSize === Number(limit.value)) return
  limit.value = nextSize
}

const openPreview = (key) => {
  if (!isPreviewSupported(key)) {
    message.error(t('mount.preview.unsupported'))
    return
  }

  previewKey.value = String(key || '')
  previewModalVisible.value = true
}

const downloadObject = (key) => {
  const url = buildDownloadUrl(key)
  if (!url) return
  window.open(url, '_blank')
}

const tableData = computed(() => {
  const basePrefix = String(prefix.value || '')
  const folders = Array.isArray(listResult.value?.folders) ? listResult.value.folders : []
  const objects = Array.isArray(listResult.value?.objects) ? listResult.value.objects : []

  const folderRows = folders.map((folderPrefix) => {
    const fullKey = String(folderPrefix || '')
    const relative = fullKey.startsWith(basePrefix) ? fullKey.slice(basePrefix.length) : fullKey
    const name = relative.endsWith('/') ? relative.slice(0, -1) : relative

    return {
      kind: 'folder',
      key: fullKey,
      name: name || fullKey,
    }
  })

  const objectRows = objects
    .map((obj) => {
      const fullKey = String(obj?.key || '')
      const relative = fullKey.startsWith(basePrefix) ? fullKey.slice(basePrefix.length) : fullKey
      return {
        kind: 'object',
        key: fullKey,
        name: relative || fullKey,
        size: obj?.size,
        last_modified: obj?.last_modified,
      }
    })
    .filter((row) => row.key && row.key !== basePrefix)

  return [...folderRows, ...objectRows]
})

const columns = computed(() => [
  {
    title: t('mount.table.name'),
    key: 'name',
    align: 'left',
    render: (row) => {
      const isFolder = row.kind === 'folder'
      const displayName = isFolder ? `${row.name}/` : row.name

      const onClick = isFolder ? () => openFolder(row.key) : undefined
      return h(Tooltip, { content: row.key }, () =>
        h(
          'span',
          {
            class: ['mount-name', isFolder ? 'is-folder' : ''],
            onClick,
          },
          [
            isFolder
              ? h('span', { class: 'mount-name-icon' }, [h(FolderOpen, { size: 16 })])
              : null,
            h('span', { class: 'mount-name-text' }, displayName),
          ]
        )
      )
    },
  },
  {
    title: t('mount.table.size'),
    key: 'size',
    width: 120,
    align: 'center',
    ellipsis: false,
    render: (row) => (row.kind === 'object' ? h('span', formatBytes(row.size)) : h('span', '-')),
  },
  {
    title: t('mount.table.lastModified'),
    key: 'last_modified',
    width: 190,
    align: 'center',
    ellipsis: false,
    render: (row) =>
      row.kind === 'object' ? h('span', formatDateTime(row.last_modified)) : h('span', '-'),
  },
  {
    title: t('mount.table.actions'),
    key: 'actions',
    width: locale.value === 'zh-CN' ? 260 : 300,
    align: 'center',
    ellipsis: false,
    render: (row) => {
      const isFolder = row.kind === 'folder'
      if (isFolder) {
        return h(
          Button,
          {
            size: 'small',
            type: 'default',
            disabled: loading.value,
            onClick: () => openFolder(row.key),
          },
          () => [h(FolderOpen, { size: 16, style: 'margin-right: 4px' }), t('mount.actions.open')]
        )
      }

      const canPreview = isPreviewSupported(row.key)
      return h('div', { class: 'action-buttons' }, [
        h(
          Button,
          {
            size: 'small',
            type: 'default',
            disabled: loading.value || !canPreview,
            onClick: () => openPreview(row.key),
          },
          () => [h(Eye, { size: 16, style: 'margin-right: 4px' }), t('mount.actions.preview')]
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'primary',
            disabled: loading.value,
            onClick: () => downloadObject(row.key),
          },
          () => [h(Download, { size: 16, style: 'margin-right: 4px' }), t('mount.actions.download')]
        ),
      ])
    },
  },
])

const loadConfigs = async () => {
  configsLoading.value = true
  try {
    const result = await api.getR2Configs()
    configs.value = result.configs || []

    if (!selectedConfigId.value) {
      selectedConfigId.value =
        String(result.default_config_id || '').trim() || String(configs.value?.[0]?.id || '').trim()
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('mount.messages.loadConfigsFailed'))
  } finally {
    configsLoading.value = false
  }
}

watch(
  () => selectedConfigId.value,
  async (value) => {
    previewModalVisible.value = false
    previewKey.value = ''

    if (!value) {
      listResult.value = null
      tokenStack.value = [null]
      return
    }

    prefix.value = ''
    prefixInput.value = ''
    tokenStack.value = [null]
    await loadObjects()
  }
)

watch(
  () => prefixInput.value,
  async (value, previousValue) => {
    if (loading.value) return

    const normalizedValue = normalizePrefix(value)
    const normalizedPreviousValue = normalizePrefix(previousValue)

    if (normalizedValue) return
    if (!normalizedPreviousValue) return
    if (!prefix.value) return

    await navigateToPrefix('')
  }
)

watch(
  () => limit.value,
  async () => {
    if (!selectedConfigId.value) return
    tokenStack.value = [null]
    await loadObjects()
  }
)

onMounted(async () => {
  prefixInput.value = prefix.value
  await loadConfigs()

  if (selectedConfigId.value) {
    await loadObjects()
  }
})
</script>

<style scoped>
.mount-page {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-lg);
}

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

@media (max-width: 720px) {
  .mount-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .mount-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .filter-row {
    justify-content: flex-start;
  }

  .filter-item.query,
  .filter-item.owner {
    width: 100%;
  }
}

.mount-browser-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-md);
}

.mount-path {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.btn-label {
  margin-left: 6px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.breadcrumb-root,
.breadcrumb-item {
  font-family: var(--nb-font-mono, ui-monospace);
  font-size: 0.875rem;
}

.clickable {
  cursor: pointer;
  color: var(--nb-link-color, var(--nb-primary));
}

.breadcrumb-sep {
  opacity: 0.6;
}

:deep(.mount-name) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

:deep(.mount-name-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

:deep(.mount-name-text) {
  display: inline-flex;
  align-items: center;
}

:deep(.mount-name.is-folder) {
  cursor: pointer;
  color: var(--nb-link-color, var(--nb-primary));
}

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
</style>
