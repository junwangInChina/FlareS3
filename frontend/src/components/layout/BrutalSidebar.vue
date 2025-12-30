<script setup>
import { computed, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useThemeStore } from "../../stores/theme";
import Modal from "../ui/modal/Modal.vue";
import FormItem from "../ui/form-item/FormItem.vue";
import Button from "../ui/button/Button.vue";

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
    { key: "/", icon: "folder", label: "文件", path: "/" },
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

const uiThemeMeta = {
  "motherduck-neobrutalism": {
    description: "高对比 / 硬阴影 / 粗边框",
    tags: ["高对比", "硬阴影", "粗边框"],
  },
  shadcn: {
    description: "简洁 / 细边框 / 柔和阴影",
    tags: ["简洁", "细边框", "柔和阴影"],
  },
};

const uiThemeCards = computed(() =>
  themeStore.availableUiThemes.map((theme) => {
    const meta = uiThemeMeta[theme.id] ?? {};
    return {
      ...theme,
      description: meta.description ?? "",
      tags: meta.tags ?? [],
    };
  })
);

const uiThemeDisabled = computed(() => uiThemeCards.value.length <= 1);

const uiThemeTitle = computed(() => {
  const current = themeStore.currentUiTheme;
  if (!current) {
    return "主题";
  }

  return `主题：${current.label}`;
});

const uiThemeModalVisible = ref(false);
const uiThemeDraft = ref(themeStore.uiTheme);

watch(uiThemeModalVisible, (visible) => {
  if (!visible) {
    return;
  }

  uiThemeDraft.value = themeStore.uiTheme;
});

const openUiThemeModal = () => {
  uiThemeModalVisible.value = true;
};

const applyUiTheme = () => {
  themeStore.setUiTheme(uiThemeDraft.value);
  uiThemeModalVisible.value = false;
};

const logoText = "FlareS3";
const logoLetters = computed(() => logoText.split(""));
</script>

<template>
  <aside class="brutal-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo" @click="navigate('/')">
        <span class="logo-text" aria-label="FLARES3">
          <span
            v-for="(letter, index) in logoLetters"
            :key="`${letter}-${index}`"
            class="logo-letter"
            >{{ letter }}</span
          >
        </span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in menuItems"
        :key="item.key"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :aria-label="item.label"
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
        <div class="user-info" :aria-label="authStore.user?.username || 'User'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
          <span v-show="!collapsed" class="username">{{
            authStore.user?.username || "User"
          }}</span>
        </div>

        <button
          class="logout-btn"
          type="button"
          @click="handleLogout"
          aria-label="退出登录"
        >
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

        <button
          class="logout-btn theme-type-btn"
          type="button"
          :aria-label="uiThemeTitle"
          @click="openUiThemeModal"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path
              d="M12 22c-5.52 0-10-4.48-10-10S6.48 2 12 2c5.52 0 10 4.48 10 10 0 1.1-.9 2-2 2h-1.5c-.83 0-1.5.67-1.5 1.5 0 .41.17.79.44 1.06.27.27.44.65.44 1.06 0 .83-.67 1.5-1.5 1.5H12zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8h4c.28 0 .5-.22.5-.5 0-.13-.05-.26-.15-.35-.64-.64-1-1.51-1-2.41 0-1.93 1.57-3.5 3.5-3.5H20c.55 0 1-.45 1-1 0-4.41-3.59-8-9-8zM6.5 11.5c.83 0 1.5-.67 1.5-1.5S7.33 8.5 6.5 8.5 5 9.17 5 10s.67 1.5 1.5 1.5zm3-4c.83 0 1.5-.67 1.5-1.5S10.33 4.5 9.5 4.5 8 5.17 8 6s.67 1.5 1.5 1.5zm5 0c.83 0 1.5-.67 1.5-1.5S15.33 4.5 14.5 4.5 13 5.17 13 6s.67 1.5 1.5 1.5zm3 4c.83 0 1.5-.67 1.5-1.5S18.33 8.5 17.5 8.5 16 9.17 16 10s.67 1.5 1.5 1.5z"
            />
          </svg>
          <span v-show="!collapsed">主题</span>
        </button>
      </div>
      <button
        class="collapse-btn"
        type="button"
        :aria-label="collapsed ? '展开' : '收起'"
        @click="toggleCollapse"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          :class="{ rotated: collapsed }"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      <Modal
        v-model:show="uiThemeModalVisible"
        title="主题"
        width="680px"
      >
        <FormItem label="选择主题">
          <div class="ui-theme-grid" role="radiogroup" aria-label="选择主题">
            <button
              v-for="theme in uiThemeCards"
              :key="theme.id"
              type="button"
              class="ui-theme-card"
              :class="{ selected: uiThemeDraft === theme.id }"
              :disabled="uiThemeDisabled"
              role="radio"
              :aria-checked="uiThemeDraft === theme.id"
              @click="uiThemeDraft = theme.id"
            >
              <div
                class="ui-theme-preview"
                :data-preview="theme.id"
                aria-hidden="true"
              >
                <div class="preview-card">
                  <div class="preview-bar"></div>
                  <div class="preview-body">
                    <div class="preview-lines">
                      <span class="preview-line"></span>
                      <span class="preview-line short"></span>
                    </div>
                    <div class="preview-actions">
                      <span class="preview-chip"></span>
                      <span class="preview-btn"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ui-theme-info">
                <div class="ui-theme-heading">
                  <span class="ui-theme-name">{{ theme.label }}</span>
                  <span
                    v-if="theme.id === themeStore.uiTheme"
                    class="ui-theme-current"
                  >
                    当前
                  </span>
                </div>
                <div v-if="theme.description" class="ui-theme-desc">
                  {{ theme.description }}
                </div>
                <div v-if="theme.tags?.length" class="ui-theme-tags">
                  <span
                    v-for="tag in theme.tags"
                    :key="tag"
                    class="ui-theme-tag"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <span class="ui-theme-check" aria-hidden="true"></span>
            </button>
          </div>
        </FormItem>

        <template #footer>
          <Button type="default" @click="uiThemeModalVisible = false"
            >取消</Button
          >
          <Button type="primary" @click="applyUiTheme">应用</Button>
        </template>
      </Modal>
    </div>
  </aside>
</template>

<style scoped>
.brutal-sidebar {
  width: 240px;
  height: 100vh;
  background: var(--nb-surface);
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

.brutal-sidebar.collapsed .sidebar-header {
  padding: var(--nb-space-sm) var(--nb-space-xs);
}

.brutal-sidebar.collapsed .logo-text {
  font-size: 11px;
  gap: 1px;
  align-items: baseline;
}

.sidebar-header {
  padding: var(--nb-space-md);
  border-bottom: var(--nb-border);
  background: var(--nb-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--nb-space-sm);
  cursor: pointer;
  overflow: hidden;
  width: 100%;
  justify-content: center;
}

.logo-text {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 22px;
  text-transform: uppercase;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  line-height: 1;
  white-space: nowrap;
}

.logo-letter {
  --logo-color: var(--nb-black);
  color: var(--logo-color);
}

@supports (-webkit-background-clip: text) {
  .logo-letter {
    background-image: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.55),
        rgba(255, 255, 255, 0)
      ),
      linear-gradient(0deg, var(--logo-color), var(--logo-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }
}

.logo-letter:nth-child(7n + 1) {
  --logo-color: var(--nb-salmon, var(--nb-black));
}

.logo-letter:nth-child(7n + 2) {
  --logo-color: var(--nb-orange, var(--nb-black));
}

.logo-letter:nth-child(7n + 3) {
  --logo-color: var(--nb-brand-yellow, var(--nb-black));
}

.logo-letter:nth-child(7n + 4) {
  --logo-color: var(--nb-lime, var(--nb-black));
}

.logo-letter:nth-child(7n + 5) {
  --logo-color: var(--nb-teal, var(--nb-black));
}

.logo-letter:nth-child(7n + 6) {
  --logo-color: var(--nb-duck-blue, var(--nb-black));
}

.logo-letter:nth-child(7n) {
  --logo-color: var(--nb-purple, var(--nb-black));
}

.sidebar-nav {
  flex: 1;
  padding: var(--nb-space-md) var(--nb-space-sm);
  /* 为浮动效果预留右侧空间 */
  padding-right: calc(var(--nb-space-sm) + 4px);
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
  border: var(--nb-border-width) solid transparent;
  border-radius: var(--nb-radius);
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 14px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  cursor: pointer;
  transition: var(--nb-transition);
  position: relative;
  text-align: left;
  width: 100%;
  color: var(--nb-gray-500);
  box-shadow: none;
}

/* shadcn/ui theme: Compact nav items */
:root[data-ui-theme="shadcn"] .nav-item {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--nb-sidebar-foreground);
}

.nav-item:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-border-color);
  color: var(--nb-black);
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

/* shadcn/ui theme: Subtle hover */
:root[data-ui-theme="shadcn"] .nav-item:hover {
  background: var(--nb-sidebar-accent);
  border-color: transparent;
  color: var(--nb-sidebar-accent-foreground);
  transform: none;
  box-shadow: none;
}

.nav-item.active {
  background: var(--nb-primary);
  border-color: var(--nb-border-color);
  color: var(--nb-primary-foreground, var(--nb-ink));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  box-shadow: none;
}

/* shadcn/ui theme: Subtle active state */
:root[data-ui-theme="shadcn"] .nav-item.active {
  background: var(--nb-sidebar-accent);
  border-color: transparent;
  color: var(--nb-sidebar-accent-foreground);
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
  /* 为浮动效果预留右侧空间 */
  padding-right: calc(var(--nb-space-md) + 4px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--nb-space-sm);
  border-bottom: var(--nb-border);
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--nb-gray-500);
}

.username {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
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
  background: var(--nb-surface);
  color: var(--nb-black);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  cursor: pointer;
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight, 700);
  font-size: 12px;
  text-transform: var(--nb-ui-text-transform, uppercase);
  letter-spacing: var(--nb-ui-letter-spacing, 0.02em);
  transition: var(--nb-transition);
  box-shadow: none;
}

.logout-btn:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-border-color);
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.logout-btn:active {
  transform: translate(0, 0);
  box-shadow: none;
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
.ui-theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--nb-space-md);
}

.ui-theme-card {
  position: relative;
  width: 100%;
  padding: var(--nb-space-md);
  background: var(--nb-surface);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  cursor: pointer;
  text-align: left;
  transition: var(--nb-transition);
  box-shadow: none;
  display: grid;
  gap: var(--nb-space-sm);
}

.ui-theme-card:hover:not(:disabled) {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
  box-shadow: var(--nb-shadow-sm);
}

.ui-theme-card:active:not(:disabled) {
  transform: translate(0, 0);
  box-shadow: none;
}

.ui-theme-card.selected {
  outline: var(--nb-focus-outline-width, 2px) solid
    var(--nb-focus-outline-color, var(--nb-primary));
  outline-offset: var(--nb-focus-outline-offset, 2px);
  box-shadow: var(--nb-shadow);
}

.ui-theme-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-theme-preview {
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-gray-100);
  padding: var(--nb-space-sm);
}

.preview-card {
  width: 100%;
  height: 92px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-bar {
  height: 10px;
}

.preview-body {
  flex: 1;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: #ffffff;
}

.preview-lines {
  display: grid;
  gap: 6px;
}

.preview-line {
  height: 6px;
  border-radius: 999px;
}

.preview-line.short {
  width: 72%;
}

.preview-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-chip {
  width: 46px;
  height: 18px;
  border-radius: 999px;
}

.preview-btn {
  width: 68px;
  height: 22px;
  border-radius: 999px;
}

.ui-theme-preview[data-preview="motherduck-neobrutalism"] .preview-card {
  border: 2px solid #383838;
  border-radius: 2px;
  background: #ffffff;
  box-shadow: -5px 5px 0px 0px #383838;
}

.ui-theme-preview[data-preview="motherduck-neobrutalism"] .preview-bar {
  background: linear-gradient(90deg, #ffde00, #6fc2ff, #53dbc9, #ff7169);
}

.ui-theme-preview[data-preview="motherduck-neobrutalism"] .preview-line {
  background: #e9e3dd;
}

.ui-theme-preview[data-preview="motherduck-neobrutalism"] .preview-chip {
  background: #6fc2ff;
  border: 2px solid #383838;
  border-radius: 2px;
}

.ui-theme-preview[data-preview="motherduck-neobrutalism"] .preview-btn {
  background: #ffde00;
  border: 2px solid #383838;
  border-radius: 2px;
}

.ui-theme-preview[data-preview="shadcn"] .preview-card {
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.ui-theme-preview[data-preview="shadcn"] .preview-bar {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.ui-theme-preview[data-preview="shadcn"] .preview-line {
  background: rgba(15, 23, 42, 0.12);
}

.ui-theme-preview[data-preview="shadcn"] .preview-chip {
  background: rgba(15, 23, 42, 0.06);
}

.ui-theme-preview[data-preview="shadcn"] .preview-btn {
  background: #3b82f6;
}

.ui-theme-info {
  display: grid;
  gap: 6px;
}

.ui-theme-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nb-space-sm);
}

.ui-theme-name {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-weight: var(--nb-ui-font-weight-strong, 900);
  font-size: 14px;
  color: var(--nb-black);
}

.ui-theme-current {
  font-family: var(--nb-font-ui, var(--nb-font-mono));
  font-size: 12px;
  padding: 2px 8px;
  border: var(--nb-border);
  border-radius: 999px;
  background: var(--nb-secondary);
  color: var(--nb-secondary-foreground, var(--nb-ink));
}

.ui-theme-desc {
  font-size: 12px;
  color: var(--nb-gray-500);
  line-height: 1.4;
}

.ui-theme-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ui-theme-tag {
  font-size: 12px;
  padding: 2px 8px;
  border: var(--nb-border);
  border-radius: 999px;
  background: var(--nb-gray-50);
  color: var(--nb-black);
}

.ui-theme-check {
  position: absolute;
  top: var(--nb-space-sm);
  right: var(--nb-space-sm);
  width: 20px;
  height: 20px;
  border: var(--nb-border);
  border-radius: 999px;
  background: var(--nb-surface);
  display: grid;
  place-items: center;
  box-shadow: none;
}

.ui-theme-check::after {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--nb-primary);
  opacity: 0;
  transform: scale(0.6);
  transition: var(--nb-transition-fast);
}

.ui-theme-card.selected .ui-theme-check::after {
  opacity: 1;
  transform: scale(1);
}

@media (max-width: 768px) {
  .brutal-sidebar {
    width: 72px;
  }

  .sidebar-header {
    padding: var(--nb-space-sm) var(--nb-space-xs);
  }

  .logo-text {
    font-size: 11px;
    gap: 1px;
    align-items: baseline;
  }

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
