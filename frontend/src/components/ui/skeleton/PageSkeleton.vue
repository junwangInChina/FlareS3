<script setup>
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'table',
    validator: (value) => ['table', 'cards', 'dashboard'].includes(value),
  },
  rows: {
    type: Number,
    default: 6,
  },
  columns: {
    type: Number,
    default: 5,
  },
  cards: {
    type: Number,
    default: 6,
  },
  lines: {
    type: Number,
    default: 3,
  },
  minCardWidth: {
    type: [Number, String],
    default: '280px',
  },
})

const normalizeSize = (value) => (typeof value === 'number' ? `${value}px` : value)
const range = (count) =>
  Array.from({ length: Math.max(1, Number(count) || 1) }, (_value, index) => index)

const rowItems = computed(() => range(props.rows))
const columnItems = computed(() => range(props.columns))
const cardItems = computed(() => range(props.cards))
const lineItems = computed(() => range(props.lines))
const tableStyle = computed(() => ({
  '--page-skeleton-columns': columnItems.value.length,
  '--page-skeleton-min-width': `${columnItems.value.length * 112}px`,
}))
const cardsStyle = computed(() => ({ '--page-skeleton-card-min': normalizeSize(props.minCardWidth) }))

const tableCellWidth = (columnIndex, rowIndex) => {
  const widths = ['68%', '88%', '54%', '72%', '46%', '62%', '80%']
  return widths[(columnIndex + rowIndex) % widths.length]
}

const cardLineWidth = (lineIndex, cardIndex) => {
  const widths = ['92%', '66%', '78%', '52%']
  return widths[(lineIndex + cardIndex) % widths.length]
}
</script>

<template>
  <div
    v-if="variant === 'dashboard'"
    class="page-skeleton page-skeleton--dashboard"
    aria-hidden="true"
  >
    <section class="dashboard-skeleton-overview">
      <div v-for="card in 4" :key="`overview-${card}`" class="skeleton-surface dashboard-overview-card">
        <SkeletonBlock width="46%" height="13px" />
        <SkeletonBlock width="72%" height="34px" radius="10px" />
        <SkeletonBlock width="58%" height="13px" />
      </div>
    </section>

    <section class="dashboard-skeleton-insights">
      <div class="dashboard-skeleton-column dashboard-skeleton-column--primary">
        <div class="skeleton-surface dashboard-insight-card dashboard-insight-card--ring">
          <SkeletonBlock width="42%" height="18px" radius="8px" />
          <div class="dashboard-ring-row">
            <SkeletonBlock width="176px" height="176px" radius="999px" />
            <div class="dashboard-ring-lines">
              <SkeletonBlock v-for="line in 4" :key="`ring-line-${line}`" width="100%" height="16px" />
            </div>
          </div>
        </div>

        <div class="skeleton-surface dashboard-insight-card">
          <SkeletonBlock width="38%" height="18px" radius="8px" />
          <div class="dashboard-bars">
            <div v-for="bar in 4" :key="`bar-${bar}`" class="dashboard-bar">
              <SkeletonBlock width="100%" :height="`${56 + bar * 8}px`" radius="12px" />
              <SkeletonBlock width="72%" height="12px" />
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-skeleton-column dashboard-skeleton-column--secondary">
        <div class="skeleton-surface dashboard-insight-card dashboard-insight-card--stack">
          <SkeletonBlock width="32%" height="18px" radius="8px" />
          <SkeletonBlock width="100%" height="72px" radius="14px" />
          <SkeletonBlock width="100%" height="96px" radius="14px" />
        </div>

        <div class="skeleton-surface dashboard-insight-card">
          <SkeletonBlock width="36%" height="18px" radius="8px" />
          <SkeletonBlock width="100%" height="10px" />
          <div class="dashboard-freshness-lines">
            <SkeletonBlock v-for="line in 3" :key="`freshness-${line}`" width="100%" height="16px" />
          </div>
        </div>
      </div>
    </section>
  </div>

  <div
    v-else-if="variant === 'cards'"
    class="page-skeleton page-skeleton--cards"
    :style="cardsStyle"
    aria-hidden="true"
  >
    <div v-for="card in cardItems" :key="`card-${card}`" class="skeleton-surface skeleton-card">
      <div class="skeleton-card-header">
        <SkeletonBlock width="32px" height="32px" radius="10px" />
        <div class="skeleton-card-title">
          <SkeletonBlock width="78%" height="16px" />
          <SkeletonBlock width="42%" height="12px" />
        </div>
      </div>
      <div class="skeleton-card-body">
        <SkeletonBlock
          v-for="line in lineItems"
          :key="`card-${card}-line-${line}`"
          :width="cardLineWidth(line, card)"
          height="14px"
        />
      </div>
      <div class="skeleton-card-footer">
        <SkeletonBlock width="42%" height="12px" />
        <SkeletonBlock width="28%" height="12px" />
      </div>
    </div>
  </div>

  <div v-else class="page-skeleton page-skeleton--table" :style="tableStyle" aria-hidden="true">
    <div class="skeleton-table-scroll">
      <div class="skeleton-table-inner">
        <div class="skeleton-table-row skeleton-table-row--header">
          <SkeletonBlock
            v-for="column in columnItems"
            :key="`header-${column}`"
            :width="tableCellWidth(column, 0)"
            height="14px"
          />
        </div>
        <div v-for="row in rowItems" :key="`row-${row}`" class="skeleton-table-row">
          <SkeletonBlock
            v-for="column in columnItems"
            :key="`row-${row}-column-${column}`"
            :width="tableCellWidth(column, row + 1)"
            height="16px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-skeleton {
  width: 100%;
  min-width: 0;
}

.skeleton-surface {
  min-width: 0;
  border: var(--nb-border);
  border-radius: var(--nb-radius, 10px);
  background: var(--nb-surface, #ffffff);
  box-shadow: var(--nb-shadow);
}

:root[data-ui-theme='shadcn'] .skeleton-surface {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--card);
}

.page-skeleton--table {
  overflow-x: auto;
}

.skeleton-table-scroll {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  border: var(--nb-border);
  border-radius: var(--nb-radius, 10px);
  background: var(--nb-surface, #ffffff);
  box-shadow: var(--nb-shadow);
}

:root[data-ui-theme='shadcn'] .skeleton-table-scroll {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--card);
}

.skeleton-table-inner {
  width: 100%;
  min-width: var(--page-skeleton-min-width);
}

.skeleton-table-row {
  display: grid;
  grid-template-columns: repeat(var(--page-skeleton-columns), minmax(96px, 1fr));
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--nb-border, #d4d4d8) 76%, transparent);
}

.skeleton-table-row--header {
  padding-top: 16px;
  padding-bottom: 16px;
  background: color-mix(in srgb, var(--nb-secondary, #f4f4f5) 64%, transparent);
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

:root[data-ui-theme='shadcn'] .skeleton-table-row {
  border-bottom-color: var(--border);
}

:root[data-ui-theme='shadcn'] .skeleton-table-row--header {
  background: color-mix(in oklab, var(--muted, #f1f5f9) 54%, transparent);
}

.page-skeleton--cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--page-skeleton-card-min), 1fr));
  gap: var(--nb-space-lg);
}

.skeleton-card {
  display: grid;
  gap: var(--nb-space-md);
  padding: var(--nb-space-lg);
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  min-width: 0;
}

.skeleton-card-title {
  display: grid;
  flex: 1;
  gap: 8px;
  min-width: 0;
}

.skeleton-card-body {
  display: grid;
  gap: 10px;
  padding: var(--nb-space-sm);
  border-radius: var(--nb-radius, 10px);
  background: color-mix(in srgb, var(--nb-gray-100, #f4f4f5) 76%, transparent);
}

:root[data-ui-theme='shadcn'] .skeleton-card-body {
  background: color-mix(in oklab, var(--muted, #f1f5f9) 58%, transparent);
}

.skeleton-card-footer {
  display: flex;
  justify-content: space-between;
  gap: var(--nb-space-sm);
}

.dashboard-skeleton-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--nb-space-md);
  align-items: start;
}

.dashboard-overview-card {
  display: grid;
  gap: 12px;
  padding: var(--nb-space-lg);
}

.dashboard-skeleton-insights {
  display: grid;
  grid-template-columns: max-content minmax(360px, 1fr);
  gap: 12px;
  align-items: start;
  margin-top: var(--nb-space-lg);
}

.dashboard-skeleton-column {
  display: grid;
  gap: 12px;
  align-content: start;
}

.dashboard-insight-card {
  display: grid;
  gap: 16px;
  padding: var(--nb-space-lg);
}

.dashboard-insight-card--ring {
  width: fit-content;
  max-width: 100%;
}

.dashboard-ring-row {
  display: grid;
  grid-template-columns: minmax(170px, 208px) minmax(150px, 220px);
  gap: 20px;
  align-items: center;
}

.dashboard-ring-lines,
.dashboard-freshness-lines {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.dashboard-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  min-height: 108px;
}

.dashboard-bar {
  display: grid;
  align-items: end;
  gap: 8px;
}

.dashboard-insight-card--stack {
  gap: 14px;
}

@media (max-width: 1080px) {
  .dashboard-skeleton-insights {
    grid-template-columns: max-content minmax(280px, 1fr);
  }

  .dashboard-ring-row {
    grid-template-columns: minmax(160px, 196px) minmax(0, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .page-skeleton--cards,
  .dashboard-skeleton-overview,
  .dashboard-skeleton-insights {
    grid-template-columns: minmax(0, 1fr);
  }

  .skeleton-table-row {
    gap: 12px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .skeleton-card,
  .dashboard-overview-card,
  .dashboard-insight-card {
    padding: var(--nb-space-md);
  }

  .dashboard-ring-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboard-bars {
    min-height: 96px;
  }
}
</style>
