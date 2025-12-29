<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  loading: Boolean
})
</script>

<template>
  <div class="brutal-table-wrapper">
    <div v-if="loading" class="loading-overlay">
      <div class="loader"></div>
    </div>
    <table class="brutal-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{
              width: col.width ? `${col.width}px` : 'auto',
              textAlign: col.align || 'left'
            }"
          >
            {{ col.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="data.length === 0">
          <td :colspan="columns.length" class="empty-cell">
            暂无数据
          </td>
        </tr>
        <tr v-for="(row, index) in data" :key="index">
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
            :class="{ 'cell-ellipsis': col.ellipsis !== false }"
          >
            <template v-if="col.render">
              <component :is="col.render(row)" />
            </template>
            <template v-else>
              <span>{{ row[col.key] }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.brutal-table-wrapper {
  position: relative;
  overflow-x: auto;
  border: var(--nb-border);
  box-shadow: var(--nb-shadow);
  border-radius: var(--nb-radius);
  background: var(--nb-surface);
}

/* shadcn/ui theme: Remove border and shadow when inside card */
:root[data-ui-theme="shadcn"] .brutal-card .brutal-table-wrapper {
  border: none;
  box-shadow: none;
  border-radius: 0;
}

/* shadcn/ui theme: Add top border when inside card */
:root[data-ui-theme="shadcn"] .brutal-card .brutal-table-wrapper {
  border-top: var(--nb-border);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--nb-overlay-bg, rgba(0, 0, 0, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loader {
  width: 32px;
  height: 32px;
  border: 4px solid var(--nb-black);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.brutal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: transparent;
}

.brutal-table th,
.brutal-table td {
  border: var(--nb-border);
  padding: 12px 16px;
  text-align: left;
}

/* shadcn/ui theme: Better table spacing */
:root[data-ui-theme="shadcn"] .brutal-table th,
:root[data-ui-theme="shadcn"] .brutal-table td {
  padding: 12px 16px;
  border: none;
  border-bottom: var(--nb-border);
}

:root[data-ui-theme="shadcn"] .brutal-table th {
  border-bottom-width: 1px;
}

/* Cell with ellipsis */
.cell-ellipsis {
  max-width: 0; /* Force ellipsis to work */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-ellipsis > span {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
  cursor: help; /* Show help cursor on hover */
}

.cell-ellipsis :deep(.brutal-tooltip-trigger),
.cell-ellipsis :deep(.tooltip-trigger) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  cursor: help;
}

.brutal-table th {
  background-color: var(--nb-primary);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  text-transform: var(--nb-ui-text-transform, uppercase);
  font-size: 13px;
  color: var(--nb-primary-foreground, var(--nb-ink));
  border-color: var(--nb-border-color);
}

/* shadcn/ui theme: Modern table header */
:root[data-ui-theme="shadcn"] .brutal-table th {
  background-color: var(--nb-gray-50);
  color: var(--nb-muted-foreground);
  font-size: var(--nb-font-size-xs);
  font-weight: var(--nb-font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.brutal-table tr:hover td {
  background-color: var(--nb-gray-100);
}

/* shadcn/ui theme: Subtle hover effect */
:root[data-ui-theme="shadcn"] .brutal-table tbody tr {
  transition: background-color var(--nb-transition-duration) var(--nb-transition-easing);
}

:root[data-ui-theme="shadcn"] .brutal-table tbody tr:hover td {
  background-color: var(--nb-gray-50);
}

.empty-cell {
  text-align: center;
  padding: 40px;
  color: var(--nb-gray-500);
  font-style: italic;
}

/* shadcn/ui theme: Better empty state */
:root[data-ui-theme="shadcn"] .empty-cell {
  padding: 60px 40px;
  font-size: var(--nb-font-size-sm);
  color: var(--nb-muted-foreground);
}
</style>
