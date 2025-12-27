<script setup>
defineProps({
  title: String,
  headerBg: { type: String, default: 'var(--nb-accent)' },
  headerColor: String
})
</script>

<template>
  <div class="brutal-card">
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
.brutal-card {
  background-color: var(--nb-surface);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow);
  border-radius: var(--nb-radius);
  overflow: hidden;
}

/* shadcn/ui theme: Enhanced card styling */
:root[data-ui-theme="shadcn"] .brutal-card {
  box-shadow: var(--nb-shadow-xs);
  transition: box-shadow var(--nb-transition-duration) var(--nb-transition-easing);
}

:root[data-ui-theme="shadcn"] .brutal-card:hover {
  box-shadow: var(--nb-shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nb-space-lg);
  border-bottom: var(--nb-border);
  border-bottom-color: var(--nb-card-header-border-color, currentColor);
}

/* shadcn/ui theme: Compact header */
:root[data-ui-theme="shadcn"] .card-header {
  padding: var(--nb-space-md) var(--nb-space-lg);
  background-color: transparent;
}

.card-title {
  margin: 0;
  font-size: var(--nb-font-size-lg);
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  text-transform: var(--nb-heading-text-transform, uppercase);
  letter-spacing: var(--nb-heading-letter-spacing, 0.02em);
}

/* shadcn/ui theme: Compact title */
:root[data-ui-theme="shadcn"] .card-title {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold);
  text-transform: none;
  letter-spacing: var(--nb-heading-letter-spacing);
}

.header-extra {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.card-body {
  padding: var(--nb-space-lg);
}

/* shadcn/ui theme: Compact padding */
:root[data-ui-theme="shadcn"] .card-body {
  padding: var(--nb-space-lg);
}

/* shadcn/ui theme: Remove padding when card contains table */
:root[data-ui-theme="shadcn"] .card-body:has(.brutal-table-wrapper) {
  padding: 0;
}

/* shadcn/ui theme: Pagination stays at bottom without extra padding */
:root[data-ui-theme="shadcn"] .card-body:has(.brutal-table-wrapper) .pagination {
  margin: 0;
}

.card-footer {
  padding: var(--nb-space-md);
  border-top: var(--nb-border);
  background-color: var(--nb-gray-100);
}

/* shadcn/ui theme: Footer styling */
:root[data-ui-theme="shadcn"] .card-footer {
  padding: var(--nb-space-md) var(--nb-space-lg);
  background-color: var(--nb-gray-50);
}
</style>
