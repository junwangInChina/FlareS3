<template>
  <Card class="texts-table-card">
    <Table class="texts-table" :columns="columns" :data="data" :loading="loading" />

    <Pagination
      v-if="Number(total || 0) > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :disabled="disabled"
      @update:page="emit('update:page', $event)"
      @update:page-size="emit('update:page-size', $event)"
    />
  </Card>
</template>

<script setup>
import Card from '../ui/card/Card.vue'
import Table from '../ui/table/Table.vue'
import Pagination from '../ui/pagination/Pagination.vue'

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
  total: {
    type: [Number, String],
    default: 0,
  },
  page: {
    type: Number,
    required: true,
  },
  pageSize: {
    type: Number,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:page', 'update:page-size'])
</script>

<style scoped>
:deep(.texts-table .brutal-table),
:deep(.texts-table .shadcn-table) {
  table-layout: fixed;
}

:deep(.texts-table .brutal-table th),
:deep(.texts-table .brutal-table td),
:deep(.texts-table .shadcn-table th),
:deep(.texts-table .shadcn-table td) {
  white-space: nowrap;
}

:deep(.action-buttons) {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
</style>
