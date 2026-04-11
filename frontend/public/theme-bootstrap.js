(() => {
  try {
    const themeStorageKey = 'flares3:theme'
    const uiThemeStorageKey = 'flares3:ui-theme'
    const defaultUiTheme = 'motherduck-neobrutalism'
    const availableModes = ['light', 'dark']
    const availableUiThemes = [defaultUiTheme, 'shadcn']

    const storedMode = window.localStorage.getItem(themeStorageKey)
    const mode = availableModes.includes(storedMode)
      ? storedMode
      : window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
        ? 'dark'
        : 'light'

    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode

    const storedUiTheme = window.localStorage.getItem(uiThemeStorageKey)
    const uiTheme = availableUiThemes.includes(storedUiTheme) ? storedUiTheme : defaultUiTheme
    document.documentElement.dataset.uiTheme = uiTheme
  } catch {
    // Ignore bootstrap failures and let the app re-apply theme state after mount.
  }
})()
