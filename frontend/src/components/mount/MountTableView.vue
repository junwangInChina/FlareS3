<template>
  <Table class="mount-table" :columns="columns" :data="data" :loading="loading" />
</template>

<script setup>
import Table from '../ui/table/Table.vue'

defineProps({
  columns: {
    type: Array,
    required: true,
  },
  data: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
:deep(.mount-table .brutal-table),
:deep(.mount-table .shadcn-table) {
  table-layout: fixed;
}

:deep(.mount-table .brutal-table th),
:deep(.mount-table .brutal-table td),
:deep(.mount-table .shadcn-table th),
:deep(.mount-table .shadcn-table td) {
  white-space: nowrap;
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
