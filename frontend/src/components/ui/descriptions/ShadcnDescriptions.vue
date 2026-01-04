<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  column: { type: Number, default: 2 },
})
</script>

<template>
  <div class="shadcn-descriptions" :class="`columns-${column}`">
    <div v-for="(item, index) in items" :key="index" class="desc-item">
      <div class="desc-label">{{ item.label }}</div>
      <div class="desc-value">{{ item.value }}</div>
    </div>
  </div>
</template>

<style scoped>
.shadcn-descriptions {
  display: grid;
  gap: 16px;
}

.columns-1 {
  grid-template-columns: 1fr;
}
.columns-2 {
  grid-template-columns: repeat(2, 1fr);
}
.columns-3 {
  grid-template-columns: repeat(3, 1fr);
}

.desc-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desc-label {
  font-size: 0.875rem;
  font-weight: var(--nb-font-weight-medium);
  color: var(--muted-foreground);
}

.desc-value {
  font-size: 0.875rem;
  color: var(--foreground);
}
</style>
