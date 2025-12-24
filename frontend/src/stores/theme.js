import { defineStore } from "pinia";

const themeStorageKey = "flares3:theme";
const themeModes = ["light", "dark"];

const getSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
};

const applyThemeToDocument = (mode) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
};

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: "light",
  }),

  getters: {
    isDark: (state) => state.mode === "dark",
  },

  actions: {
    init() {
      if (typeof window === "undefined") {
        return;
      }

      const fromDom = document?.documentElement?.dataset?.theme;
      if (themeModes.includes(fromDom)) {
        this.mode = fromDom;
        applyThemeToDocument(fromDom);
        return;
      }

      let stored = null;
      try {
        stored = window.localStorage.getItem(themeStorageKey);
      } catch {
        stored = null;
      }

      const initial = themeModes.includes(stored) ? stored : getSystemTheme();
      this.mode = initial;
      applyThemeToDocument(initial);
    },

    setMode(mode) {
      if (!themeModes.includes(mode)) {
        return;
      }

      this.mode = mode;
      applyThemeToDocument(mode);

      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(themeStorageKey, mode);
      } catch {
        // ignore
      }
    },

    toggle() {
      this.setMode(this.isDark ? "light" : "dark");
    },
  },
});

