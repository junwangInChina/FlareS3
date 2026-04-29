import { ref, watch } from 'vue'
import { useIsMobile } from './useViewport.js'

const validViewModes = new Set(['table', 'card'])

const readStorage = (key) => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key, value) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore storage failures
  }
}

const toScopedStorageKey = (storageKey, isMobile) =>
  `${storageKey}:${isMobile ? 'mobile' : 'desktop'}`

const resolveStoredViewMode = ({ storageKey, isMobile, desktopDefault, mobileDefault }) => {
  const scopedStored = readStorage(toScopedStorageKey(storageKey, isMobile))
  if (validViewModes.has(scopedStored)) {
    return scopedStored
  }

  if (!isMobile) {
    const legacyStored = readStorage(storageKey)
    if (validViewModes.has(legacyStored)) {
      return legacyStored
    }
  }

  return isMobile ? mobileDefault : desktopDefault
}

export function useResponsiveViewMode({
  storageKey,
  desktopDefault = 'table',
  mobileDefault = 'card',
} = {}) {
  const isMobile = useIsMobile()
  const viewMode = ref(
    resolveStoredViewMode({
      storageKey,
      isMobile: isMobile.value,
      desktopDefault,
      mobileDefault,
    })
  )

  const setViewMode = (mode) => {
    if (!validViewModes.has(mode)) {
      return
    }
    viewMode.value = mode
  }

  watch(isMobile, (mobile) => {
    viewMode.value = resolveStoredViewMode({
      storageKey,
      isMobile: mobile,
      desktopDefault,
      mobileDefault,
    })
  })

  watch(viewMode, (value) => {
    if (!validViewModes.has(value)) {
      return
    }
    writeStorage(toScopedStorageKey(storageKey, isMobile.value), value)
  })

  return {
    isMobile,
    viewMode,
    setViewMode,
  }
}
