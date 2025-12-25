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
            :style="{ width: col.width ? `${col.width}px` : 'auto' }"
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
          <td v-for="col in columns" :key="col.key">
            <template v-if="col.render">
              <component :is="col.render(row)" />
            </template>
            <template v-else>
              {{ row[col.key] }}
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(244, 239, 234, 0.85);
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
  background: transparent;
}

.brutal-table th,
.brutal-table td {
  border: 2px solid var(--nb-black);
  padding: 12px 16px;
  text-align: left;
}

.brutal-table th {
  background-color: var(--nb-primary);
  font-family: var(--nb-font-mono);
  font-weight: 900;
  text-transform: uppercase;
  font-size: 13px;
  color: var(--nb-ink);
  border-color: var(--nb-ink);
}

.brutal-table tr:hover td {
  background-color: var(--nb-gray-100);
}

.empty-cell {
  text-align: center;
  padding: 40px;
  color: var(--nb-gray-500);
  font-style: italic;
}
</style>
