<script setup>
defineProps({
  title: String,
  headerBg: { type: String, default: 'transparent' },
  headerColor: String
})
</script>

<template>
  <div class="shadcn-card">
    <div
      v-if="title || $slots.header"
      class="card-header"
      :style="{ backgroundColor: headerBg, color: headerColor }"
    >
      <slot name="header">
        <h3 class="card-title">{{ title }}</h3>
      </slot>
      <div v-if="$slots['header-extra']" class="header-extra">
        <slot name="header-extra" />
      </div>
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.shadcn-card {
  background-color: var(--nb-surface);
  border: var(--nb-border);
  border-radius: var(--nb-radius-sm);
  box-shadow: var(--nb-shadow-xs);
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}

.shadcn-card:hover {
  box-shadow: var(--nb-shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-bottom: var(--nb-border);
}

.card-title {
  margin: 0;
  font-size: var(--nb-font-size-lg);
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-foreground);
}

.header-extra {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.card-body {
  padding: var(--nb-space-lg);
}

.card-footer {
  padding: var(--nb-space-md) var(--nb-space-lg);
  border-top: var(--nb-border);
  background-color: var(--nb-gray-50);
}
</style>
