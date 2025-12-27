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

/* shadcn/ui theme: Compact spacing */
:root[data-ui-theme="shadcn"] .main-content {
  padding: var(--nb-space-lg);
}

.sidebar-collapsed .main-content {
  margin-left: 72px;
}

.content-container {
  margin: 0 auto;
}

/* shadcn/ui theme: Compact gap between cards */
:root[data-ui-theme="shadcn"] .content-container {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-md);
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 72px;
  }

  /* shadcn/ui theme: Reduce padding on mobile */
  :root[data-ui-theme="shadcn"] .main-content {
    padding: var(--nb-space-md);
  }
}
</style>
