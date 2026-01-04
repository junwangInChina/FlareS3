<script setup>
defineProps({
  title: String,
  headerBg: { type: String, default: 'transparent' },
  headerColor: String,
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
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
}

.card-title {
  margin: 0;
  font-size: 1.5rem;
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  line-height: 1;
  letter-spacing: -0.01em;
  color: inherit;
}

.header-extra {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
}

.card-body {
  padding: 24px;
}

.card-header + .card-body {
  padding-top: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  padding: 24px;
}

.card-body + .card-footer {
  padding-top: 0;
}
</style>
