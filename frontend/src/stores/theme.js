import { defineStore } from "pinia";
import {
  defaultUiThemeId,
  getUiThemeById,
  isKnownUiTheme,
  uiThemes,
} from "../themes";

const themeStorageKey = "flares3:theme";
const uiThemeStorageKey = "flares3:ui-theme";
const themeModes = ["light", "dark"];

const readStorage = (key) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

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

const applyUiThemeToDocument = (uiThemeId) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.uiTheme = uiThemeId;
};

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: "light",
    uiTheme: defaultUiThemeId,
  }),

  getters: {
    isDark: (state) => state.mode === "dark",
    availableUiThemes: () => uiThemes,
    currentUiTheme: (state) => getUiThemeById(state.uiTheme),
  },

  actions: {
    init() {
      if (typeof window === "undefined") {
        return;
      }

      const fromDomMode = document?.documentElement?.dataset?.theme;
      const storedMode = readStorage(themeStorageKey);
      const initialMode = themeModes.includes(fromDomMode)
        ? fromDomMode
        : themeModes.includes(storedMode)
          ? storedMode
          : getSystemTheme();
      this.mode = initialMode;
      applyThemeToDocument(initialMode);

      const fromDomUiTheme = document?.documentElement?.dataset?.uiTheme;
      const storedUiTheme = readStorage(uiThemeStorageKey);
      const initialUiTheme = isKnownUiTheme(fromDomUiTheme)
        ? fromDomUiTheme
        : isKnownUiTheme(storedUiTheme)
          ? storedUiTheme
          : defaultUiThemeId;
      this.uiTheme = initialUiTheme;
      applyUiThemeToDocument(initialUiTheme);
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

      writeStorage(themeStorageKey, mode);
    },

    setUiTheme(uiThemeId) {
      if (!isKnownUiTheme(uiThemeId)) {
        return;
      }

      this.uiTheme = uiThemeId;
      applyUiThemeToDocument(uiThemeId);

      writeStorage(uiThemeStorageKey, uiThemeId);
    },

    toggle() {
      this.setMode(this.isDark ? "light" : "dark");
    },
  },
});
