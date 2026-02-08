<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { clampPage, getPaginationItems, getTotalPages } from './pagination'
import BrutalSelect from '../select/BrutalSelect.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  displayTotal: { type: [Number, String], default: undefined },
  siblingCount: { type: Number, default: 1 },
  showTotal: { type: Boolean, default: true },
  showPageSize: { type: Boolean, default: true },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50] },
  disabled: Boolean,
})

const emit = defineEmits(['update:page', 'update:pageSize'])
const { t } = useI18n({ useScope: 'global' })

const totalPages = computed(() => getTotalPages(props.total, props.pageSize))
const displayTotal = computed(() => props.displayTotal ?? props.total)

const pageItems = computed(() =>
  getPaginationItems({
    page: props.page,
    totalPages: totalPages.value,
    siblingCount: props.siblingCount,
  })
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
  <div class="brutal-pagination">
    <nav class="nav" :aria-label="t('pagination.ariaLabel')">
      <ul class="list">
        <li v-if="showTotal" class="total-item">
          <span class="total">{{ t('pagination.total', { total: displayTotal }) }}</span>
        </li>

        <li>
          <button
            type="button"
            class="btn prev"
            :disabled="!canGoPrev"
            :aria-disabled="!canGoPrev"
            @click="goPrev"
          >
            <ChevronLeft :size="18" />
            <span class="label">{{ t('pagination.prev') }}</span>
          </button>
        </li>

        <li v-for="(item, index) in pageItems" :key="`${item}-${index}`">
          <span v-if="item === 'ellipsis'" class="ellipsis" aria-hidden="true">
            <MoreHorizontal :size="18" />
          </span>
          <button
            v-else
            type="button"
            class="btn page"
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
            class="btn next"
            :disabled="!canGoNext"
            :aria-disabled="!canGoNext"
            @click="goNext"
          >
            <span class="label">{{ t('pagination.next') }}</span>
            <ChevronRight :size="18" />
          </button>
        </li>

        <li v-if="showPageSize" class="page-size">
          <span class="page-size-label">{{ t('pagination.perPage') }}</span>
          <div class="page-size-select">
            <BrutalSelect
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
.brutal-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-top: var(--nb-border);
  flex-wrap: wrap;
}

.total-item {
  margin-right: 8px;
}

.total {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  white-space: nowrap;
}

.list {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background-color: var(--nb-surface);
  color: var(--nb-ink);
  cursor: pointer;
  transition: var(--nb-transition);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  outline: none;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.btn:active:not(:disabled) {
  transform: translate(0, 0);
  box-shadow: none;
}

.btn:focus-visible {
  outline: var(--nb-focus-outline-width) solid var(--nb-focus-outline-color);
  outline-offset: var(--nb-focus-outline-offset);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page {
  width: 42px;
  padding: 0;
}

.page.active {
  background-color: var(--nb-primary);
  color: var(--nb-primary-foreground, var(--nb-ink));
}

.ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 36px;
  border: var(--nb-border);
  background-color: var(--nb-gray-100);
}

.page-size {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.page-size-label {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  white-space: nowrap;
}

.page-size-select {
  width: 96px;
}

@media (max-width: 520px) {
  .label {
    display: none;
  }

  .prev,
  .next {
    width: 42px;
    padding: 0;
  }

  .page-size-label {
    display: none;
  }
}
</style>
