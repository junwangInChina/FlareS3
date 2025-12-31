<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";

const props = defineProps({
  title: { type: String, default: "FlareS3" },
  showNav: { type: Boolean, default: true },
});

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n({ useScope: "global" });

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};
</script>

<template>
  <header class="brutal-header">
    <div class="brand" @click="router.push('/')">
      <span class="brand-name">{{ title }}</span>
    </div>

    <nav v-if="showNav" class="nav-links">
      <button class="nav-btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path
            d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
          />
        </svg>
        {{ t("nav.files") }}
      </button>
      <template v-if="authStore.isAdmin">
        <button class="nav-btn" @click="router.push('/users')">
          {{ t("nav.users") }}
        </button>
        <button class="nav-btn" @click="router.push('/audit')">
          {{ t("nav.audit") }}
        </button>
        <button class="nav-btn" @click="router.push('/setup')">
          {{ t("nav.setup") }}
        </button>
      </template>
    </nav>

    <div class="actions">
      <a
        class="github-link"
        href="https://github.com/Today-ddr/r2box"
        target="_blank"
      >
        <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
      <button class="logout-btn" @click="handleLogout">
        {{ t("common.logout") }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.brutal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nb-space-md) var(--nb-space-lg);
  background-color: var(--nb-surface);
  border-bottom: var(--nb-border);
  height: var(--nb-header-height-mobile);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  cursor: pointer;
}

.brand-name {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 24px;
  text-transform: uppercase;
  letter-spacing: -1px;
}

.nav-links {
  display: flex;
  gap: var(--nb-space-xs);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: var(--nb-border-width) solid transparent;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  cursor: pointer;
  transition: var(--nb-transition-fast);
}

.nav-btn:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-border-color);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--nb-space-md);
}

.github-link {
  display: flex;
  align-items: center;
  padding: 8px;
  background: transparent;
  text-decoration: none;
}

.github-link:hover {
  background: var(--nb-gray-100);
}

.logout-btn {
  padding: 8px 16px;
  background: var(--nb-danger);
  color: var(--nb-white);
  border: var(--nb-border);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  cursor: pointer;
  box-shadow: none;
  transition: var(--nb-transition-fast);
}

.logout-btn:hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.logout-btn:active {
  transform: translate(0, 0);
  box-shadow: none;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}

@media (min-width: 960px) {
  .brutal-header {
    height: var(--nb-header-height-desktop);
  }
}
</style>
