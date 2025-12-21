<script setup>
defineProps({
  maxWidth: { type: String, default: '1200px' }
})
</script>

<template>
  <div class="page-layout">
    <slot name="header"></slot>
    <main class="page-content">
      <div class="container" :style="{ maxWidth }">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--nb-bg);
}

.page-content {
  flex: 1;
  padding: var(--nb-space-xl) var(--nb-space-md);
}

.container {
  margin: 0 auto;
}
</style>
