<script setup>
defineProps({
  title: String,
  items: { type: Array, default: () => [] }, // [{ label, value }]
  column: { type: Number, default: 2 }
})
</script>

<template>
  <div class="brutal-descriptions">
    <div v-if="title" class="desc-header">{{ title }}</div>
    <div class="desc-grid" :style="{ gridTemplateColumns: `repeat(${column}, 1fr)` }">
      <div v-for="(item, i) in items" :key="i" class="desc-item">
        <dt class="desc-label">{{ item.label }}</dt>
        <dd class="desc-value">
          <slot :name="item.key" :item="item">
            {{ item.value }}
          </slot>
        </dd>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.brutal-descriptions {
  border: var(--nb-border);
  background: var(--nb-surface);
  box-shadow: var(--nb-shadow-sm);
  border-radius: var(--nb-radius);
  overflow: hidden;
}

.desc-header {
  background: var(--nb-primary);
  padding: var(--nb-space-sm) var(--nb-space-md);
  font-family: var(--nb-heading-font-family, var(--nb-font-mono));
  font-weight: var(--nb-heading-font-weight, 900);
  text-transform: var(--nb-heading-text-transform, uppercase);
  border-bottom: var(--nb-border);
  color: var(--nb-primary-foreground, var(--nb-ink));
  border-bottom-color: var(--nb-border-color);
}

.desc-grid {
  display: grid;
}

.desc-item {
  display: flex;
  border-bottom: var(--nb-border);
  border-right: var(--nb-border);
}

.desc-item:last-child {
  border-bottom: none;
}

.desc-label {
  background: var(--nb-gray-100);
  padding: var(--nb-space-sm) var(--nb-space-md);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  text-transform: var(--nb-ui-text-transform, uppercase);
  font-size: 14px;
  width: 40%;
  border-right: var(--nb-border);
  flex-shrink: 0;
}

.desc-value {
  margin: 0;
  padding: var(--nb-space-sm) var(--nb-space-md);
  flex: 1;
}
</style>
