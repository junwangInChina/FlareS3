<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  loading: Boolean
})
</script>

<template>
  <div class="shadcn-table-wrapper">
    <div v-if="loading" class="loading-overlay">
      <div class="loader"></div>
    </div>
    <table class="shadcn-table">
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
.shadcn-table-wrapper {
  position: relative;
  overflow-x: auto;
  background: var(--nb-surface);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid var(--nb-gray-200);
  border-top-color: var(--nb-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.shadcn-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.shadcn-table thead {
  background-color: var(--nb-gray-50);
  border-bottom: var(--nb-border);
}

.shadcn-table th {
  padding: 12px 16px;
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-foreground);
  text-align: left;
  white-space: nowrap;
}

.shadcn-table tbody tr {
  border-bottom: var(--nb-border);
  transition: background-color 0.15s ease;
}

.shadcn-table tbody tr:hover {
  background-color: var(--nb-gray-50);
}

.shadcn-table tbody tr:last-child {
  border-bottom: none;
}

.shadcn-table td {
  padding: 12px 16px;
  color: var(--nb-foreground);
}

.cell-ellipsis {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  padding: 32px;
  color: var(--nb-muted-foreground);
}
</style>
