<script setup>
defineProps({
  title: String,
  headerBg: { type: String, default: 'var(--nb-accent)' }
})
</script>

<template>
  <div class="brutal-card">
    <div v-if="title || $slots.header" class="card-header" :style="{ backgroundColor: headerBg }">
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
  background-color: var(--nb-white);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nb-space-md);
  border-bottom: var(--nb-border);
}

.card-title {
  margin: 0;
  font-size: var(--nb-font-size-lg);
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
  padding: var(--nb-space-md);
  border-top: var(--nb-border);
  background-color: var(--nb-gray-100);
}
</style>
