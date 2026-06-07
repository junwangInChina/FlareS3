import { jsonResponse } from '../utils/response'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isUnsafeMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}

function isSameOrigin(request: Request, origin: string): boolean {
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    normalized === '127.0.0.1'
  )
}

function isLocalDevelopmentOrigin(request: Request, origin: string): boolean {
  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)
    return isLoopbackHostname(originUrl.hostname) && isLoopbackHostname(requestUrl.hostname)
  } catch {
    return false
  }
}

export function originGuardMiddleware(request: Request): Response | undefined {
  if (!isUnsafeMethod(request.method)) return

  const origin = request.headers.get('Origin')
  if (origin && !isSameOrigin(request, origin) && !isLocalDevelopmentOrigin(request, origin)) {
    return jsonResponse({ error: '跨源请求被拒绝' }, 403)
  }

  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase()
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return jsonResponse({ error: '跨源请求被拒绝' }, 403)
  }
}
