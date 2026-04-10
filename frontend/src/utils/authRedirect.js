const BACKEND_ROUTE_PREFIXES = ['/api', '/s', '/f', '/t']

function normalizeNextTarget(next) {
  const value = typeof next === 'string' ? next.trim() : ''
  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }
  if (value.startsWith('/login')) {
    return '/'
  }
  return value
}

function isBackendRouteTarget(target) {
  return BACKEND_ROUTE_PREFIXES.some(
    (prefix) => target === prefix || target.startsWith(`${prefix}/`)
  )
}

export function resolvePostLoginNavigation(next) {
  const target = normalizeNextTarget(next)
  return {
    type: isBackendRouteTarget(target) ? 'hard' : 'spa',
    target,
  }
}

export function buildLoginRouteLocation(next) {
  const target = normalizeNextTarget(next)
  if (target === '/') {
    return { path: '/login' }
  }
  return {
    path: '/login',
    query: { next: target },
  }
}

export function buildLoginUrl(next) {
  const target = normalizeNextTarget(next)
  if (target === '/') {
    return '/login'
  }
  return `/login?next=${encodeURIComponent(target)}`
}
