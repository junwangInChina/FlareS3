import { onBeforeUnmount, onMounted, ref } from 'vue'

export const MOBILE_BREAKPOINT = 768

const mediaQueryText = `(max-width: ${MOBILE_BREAKPOINT}px)`

const getViewportWidth = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const visualViewportWidth = Number(window.visualViewport?.width)
  if (Number.isFinite(visualViewportWidth) && visualViewportWidth > 0) {
    return visualViewportWidth
  }

  const innerWidth = Number(window.innerWidth)
  if (Number.isFinite(innerWidth) && innerWidth > 0) {
    return innerWidth
  }

  return null
}

export const getIsMobileViewport = () => {
  const viewportWidth = getViewportWidth()
  if (viewportWidth !== null) {
    return viewportWidth <= MOBILE_BREAKPOINT
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(mediaQueryText).matches
}

export function useIsMobile() {
  const isMobile = ref(getIsMobileViewport())
  let mediaQuery = null
  let visualViewport = null

  const updateMatches = () => {
    isMobile.value = getIsMobileViewport()
  }

  onMounted(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia(mediaQueryText)
    }
    visualViewport = window.visualViewport ?? null
    updateMatches()

    window.addEventListener('resize', updateMatches)
    visualViewport?.addEventListener?.('resize', updateMatches)

    if (!mediaQuery) {
      return
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMatches)
      return
    }

    mediaQuery.addListener(updateMatches)
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateMatches)
    }

    visualViewport?.removeEventListener?.('resize', updateMatches)

    if (!mediaQuery) {
      return
    }

    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', updateMatches)
      return
    }

    mediaQuery.removeListener(updateMatches)
  })

  return isMobile
}
