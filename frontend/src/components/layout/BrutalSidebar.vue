<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useThemeStore } from "../../stores/theme";

const props = defineProps({
  collapsed: { type: Boolean, default: false },
});

const emit = defineEmits(["update:collapsed"]);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const menuItems = computed(() => {
  const items = [
    { key: "/", icon: "upload", label: "上传", path: "/" },
    { key: "/files", icon: "folder", label: "文件", path: "/files" },
    { key: "/stats", icon: "chart", label: "统计", path: "/stats" },
  ];

  if (authStore.isAdmin) {
    items.push(
      { key: "/users", icon: "users", label: "用户", path: "/users" },
      { key: "/audit", icon: "audit", label: "审计", path: "/audit" },
      { key: "/setup", icon: "settings", label: "R2 配置", path: "/setup" }
    );
  }

  return items;
});

const isActive = (path) => route.path === path;

const navigate = (path) => {
  router.push(path);
};

const toggleCollapse = () => {
  emit("update:collapsed", !props.collapsed);
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};

const themeLabel = computed(() => (themeStore.isDark ? "黑夜" : "白天"));
const themeTitle = computed(() =>
  themeStore.isDark ? "切换到白天模式" : "切换到黑夜模式"
);

const handleToggleTheme = () => {
  themeStore.toggle();
};
</script>

<template>
  <aside class="brutal-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo" @click="navigate('/')">
        <div class="logo-icon">F</div>
        <span v-show="!collapsed" class="logo-text">FlareS3</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in menuItems"
        :key="item.key"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :title="collapsed ? item.label : ''"
        @click="navigate(item.path)"
      >
        <span class="nav-icon">
          <svg
            v-if="item.icon === 'upload'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
          </svg>
          <svg
            v-else-if="item.icon === 'folder'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'chart'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'users'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'audit'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'settings'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </span>
        <span v-show="!collapsed" class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-section">
        <div
          class="user-info"
          :title="collapsed ? authStore.user?.username : ''"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
          <span v-show="!collapsed" class="username">{{
            authStore.user?.username || "User"
          }}</span>
        </div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            />
          </svg>
          <span v-show="!collapsed">退出</span>
        </button>

        <button
          class="logout-btn theme-btn"
          type="button"
          :title="themeTitle"
          :aria-label="themeTitle"
          :aria-pressed="themeStore.isDark"
          @click="handleToggleTheme"
        >
          <svg
            v-if="themeStore.isDark"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path
              d="M21.64 13.65A9 9 0 0 1 10.35 2.36a.75.75 0 0 0-.93-.93A10.5 10.5 0 1 0 22.57 14.58a.75.75 0 0 0-.93-.93z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path
              d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.45 0l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM12 4V1h-1.99v3H12zm0 19v-3h-1.99v3H12zM4 13H1v-2h3v2zm19 0h-3v-2h3v2zM6.76 19.16l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zm10.45 0l1.42 1.42 1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"
            />
          </svg>
          <span v-show="!collapsed">{{ themeLabel }}</span>
        </button>
      </div>
      <button
        class="collapse-btn"
        @click="toggleCollapse"
        :title="collapsed ? '展开' : '收起'"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          :class="{ rotated: collapsed }"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.brutal-sidebar {
  width: 240px;
  height: 100vh;
  background: var(--nb-white);
  border-right: var(--nb-border);
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.brutal-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: var(--nb-space-md);
  border-bottom: var(--nb-border);
  background: var(--nb-white);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  cursor: pointer;
  overflow: hidden;
}

.logo-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: var(--nb-black);
  color: var(--nb-white);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nb-radius);
  font-family: var(--nb-font-sans);
  font-weight: 600;
  font-size: 20px;
  border: 1px solid var(--nb-gray-300);
}

.logo-text {
  font-family: var(--nb-font-sans);
  font-weight: 600;
  font-size: 18px;
  text-transform: none;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: var(--nb-space-md) var(--nb-space-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  padding: 12px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--nb-radius);
  font-family: var(--nb-font-sans);
  font-weight: 500;
  font-size: 14px;
  text-transform: none;
  cursor: pointer;
  transition: var(--nb-transition);
  position: relative;
  text-align: left;
  width: 100%;
  color: var(--nb-gray-600);
}

.nav-item:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-gray-300);
  color: var(--nb-black);
}

.nav-item.active {
  background: var(--nb-gray-100);
  border-color: var(--nb-gray-300);
  color: var(--nb-black);
  font-weight: 600;
  box-shadow: none;
}

.nav-icon {
  width: 20px;
  height: 20px;
  min-width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon svg {
  width: 20px;
  height: 20px;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-footer {
  border-top: var(--nb-border);
  background: var(--nb-gray-100);
}

.user-section {
  padding: var(--nb-space-sm) var(--nb-space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nb-space-sm);
  border-bottom: 1px solid var(--nb-gray-200);
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--nb-gray-500);
}

.username {
  font-family: var(--nb-font-sans);
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  background: var(--nb-white);
  color: var(--nb-black);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  cursor: pointer;
  font-family: var(--nb-font-sans);
  font-weight: 600;
  font-size: 12px;
  text-transform: none;
  transition: var(--nb-transition);
}

.logout-btn:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-gray-300);
  transform: translateY(-1px);
}

.theme-btn {
  background: var(--nb-gray-100);
}

.theme-btn:hover {
  background: var(--nb-white);
}

.collapse-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: none;
  border-radius: var(--nb-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--nb-transition);
  color: var(--nb-gray-500);
}

.collapse-btn:hover {
  background: var(--nb-gray-100);
  color: var(--nb-black);
}

.collapse-btn svg {
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
}

.collapse-btn svg.rotated {
  transform: rotate(180deg);
}

.collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.collapsed .user-section {
  padding: var(--nb-space-sm);
  align-items: center;
}

.collapsed .user-info {
  justify-content: center;
}

.collapsed .logout-btn {
  width: auto;
  padding: 8px;
}

@media (max-width: 768px) {
  .brutal-sidebar {
    width: 72px;
  }

  .logo-text,
  .nav-label,
  .username {
    display: none !important;
  }

  .nav-item {
    justify-content: center;
    padding: 12px;
  }

  .user-section {
    padding: var(--nb-space-sm);
    align-items: center;
  }

  .logout-btn {
    width: auto;
    padding: 8px;
  }

  .logout-btn span {
    display: none;
  }
}
</style>
