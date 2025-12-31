<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { clampPage, getPaginationItems, getTotalPages } from './pagination'
import ShadcnSelect from '../select/ShadcnSelect.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  siblingCount: { type: Number, default: 1 },
  showTotal: { type: Boolean, default: true },
  showPageSize: { type: Boolean, default: true },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50] },
  disabled: Boolean,
})

const emit = defineEmits(['update:page', 'update:pageSize'])
const { t } = useI18n({ useScope: 'global' })

const totalPages = computed(() => getTotalPages(props.total, props.pageSize))
const pageItems = computed(() =>
  getPaginationItems({
    page: props.page,
    totalPages: totalPages.value,
    siblingCount: props.siblingCount,
  }),
)

const canGoPrev = computed(() => !props.disabled && props.page > 1)
const canGoNext = computed(() => !props.disabled && props.page < totalPages.value)

const goToPage = (targetPage) => {
  if (props.disabled) return
  const maxPage = totalPages.value || 1
  const nextPage = clampPage(targetPage, 1, maxPage)
  if (nextPage === props.page) return
  emit('update:page', nextPage)
}

const goPrev = () => goToPage(props.page - 1)
const goNext = () => goToPage(props.page + 1)
const isActivePage = (value) => Number(value) === Number(props.page)

const pageSizeSelectOptions = computed(() => {
  const options = Array.isArray(props.pageSizeOptions) ? props.pageSizeOptions : []
  const normalized = options
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
  const unique = Array.from(new Set(normalized))
  return unique.map((value) => ({ label: String(value), value }))
})

const changePageSize = (value) => {
  if (props.disabled) return
  const nextSize = Number(value)
  if (!Number.isFinite(nextSize) || nextSize <= 0) return
  if (nextSize === props.pageSize) return
  emit('update:pageSize', nextSize)
}
</script>

<template>
  <div class="shadcn-pagination">
    <nav class="nav" :aria-label="t('pagination.ariaLabel')">
      <ul class="list">
        <li v-if="showTotal" class="total-item">
          <span class="total">{{ t('pagination.total', { total }) }}</span>
        </li>

        <li>
          <button
            type="button"
            class="link prev"
            :disabled="!canGoPrev"
            :aria-disabled="!canGoPrev"
            @click="goPrev"
          >
            <ChevronLeft :size="16" />
            <span class="label">{{ t('pagination.prev') }}</span>
          </button>
        </li>

        <li v-for="(item, index) in pageItems" :key="`${item}-${index}`">
          <span v-if="item === 'ellipsis'" class="ellipsis" aria-hidden="true">
            <MoreHorizontal :size="16" />
            <span class="sr-only">{{ t('pagination.more') }}</span>
          </span>
          <button
            v-else
            type="button"
            class="link page"
            :class="{ active: isActivePage(item) }"
            :aria-current="isActivePage(item) ? 'page' : undefined"
            :disabled="disabled"
            @click="goToPage(item)"
          >
            {{ item }}
          </button>
        </li>

        <li>
          <button
            type="button"
            class="link next"
            :disabled="!canGoNext"
            :aria-disabled="!canGoNext"
            @click="goNext"
          >
            <span class="label">{{ t('pagination.next') }}</span>
            <ChevronRight :size="16" />
          </button>
        </li>

        <li v-if="showPageSize" class="page-size">
          <span class="page-size-label">{{ t('pagination.perPage') }}</span>
          <div class="page-size-select">
            <ShadcnSelect
              :model-value="pageSize"
              :options="pageSizeSelectOptions"
              size="small"
              :disabled="disabled"
              @update:model-value="changePageSize"
            />
          </div>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
.shadcn-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-top: 1px solid var(--border);
}

.total-item {
  margin-right: 0.25rem;
}

.total {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.nav {
  display: flex;
  align-items: center;
}

.list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 2.25rem; /* h-9 */
  padding: 0 1rem; /* px-4 */
  border-radius: var(--nb-radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
  font-size: 0.875rem;
  font-weight: var(--nb-font-weight-medium);
  line-height: 1;
  white-space: nowrap;
}

.link:hover:not(:disabled) {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.link:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

.link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page {
  width: 2.25rem;
  padding: 0;
}

.page.active {
  border-color: var(--input);
  background-color: var(--background);
}

.prev {
  padding-left: 0.625rem; /* pl-2.5 */
}

.next {
  padding-right: 0.625rem; /* pr-2.5 */
}

.page-size {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.page-size-label {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.page-size-select {
  width: 96px;
}

.ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--muted-foreground);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 520px) {
  .shadcn-pagination {
    justify-content: center;
  }

  .label {
    display: none;
  }

  .prev,
  .next {
    width: 2.25rem;
    padding: 0;
  }

  .page-size-label {
    display: none;
  }
}
</style>
