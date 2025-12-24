<script setup>
import { onMounted, ref, watch } from "vue";
import BrutalSidebar from "./BrutalSidebar.vue";

defineProps({
  maxWidth: { type: String, default: "100%" },
});

const sidebarCollapsed = ref(false);
const sidebarCollapsedKey = "flares3:sidebar-collapsed";

onMounted(() => {
  if (typeof window === "undefined") {
    return;
  }

  const stored = window.localStorage.getItem(sidebarCollapsedKey);
  if (stored === null) {
    return;
  }

  sidebarCollapsed.value = stored === "true";
});

watch(sidebarCollapsed, (value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(sidebarCollapsedKey, String(value));
});
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <BrutalSidebar v-model:collapsed="sidebarCollapsed" />

    <main class="main-content">
      <div class="content-container" :style="{ maxWidth }">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--nb-bg);
}

.main-content {
  margin-left: 240px;
  min-height: 100vh;
  padding: var(--nb-space-lg);
  transition: margin-left 0.2s ease;
}

.sidebar-collapsed .main-content {
  margin-left: 72px;
}

.content-container {
  margin: 0 auto;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 72px;
  }
}
</style>
