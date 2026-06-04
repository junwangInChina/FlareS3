import type { Env } from './config/env'
import { requestIdMiddleware } from './middleware/requestId'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { bootstrapAdmin } from './middleware/bootstrapAdmin'
import { authSessionMiddleware } from './middleware/authSession'
import { withCommonHeaders } from './middleware/securityHeaders'
import { handleFrontendRequest } from './middleware/assets'
import { router } from './router'
import { serializeError, logRequestFailure } from './utils/log'

const isolateCreatedAt = Date.now()
let isolateRequestCount = 0
let lastRequestStartedAt: number | null = null

type TimingEntry = {
  name: string
  durationMs: number
}

type RuntimeDiagnostics = {
  isolateAgeMs: number
  isolateIdleMs: number | null
  isolateRequestCount: number
}

function isBackendPath(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/f/')
  )
}

function shouldRunBootstrapAdmin(request: Request, pathname: string): boolean {
  return request.method === 'POST' && pathname === '/api/auth/login'
}

async function healthResponse(env: Env): Promise<Response> {
  const timestamp = new Date().toISOString()
  let dbStatus: 'ok' | 'error' | 'unavailable' = 'unavailable'
  let dbError: string | undefined
  if (env.DB) {
    try {
      await env.DB.prepare('SELECT 1').first()
      dbStatus = 'ok'
    } catch (error) {
      dbStatus = 'error'
      dbError = serializeError(error)
    }
  }
  const overall = dbStatus === 'ok' || dbStatus === 'unavailable' ? 'ok' : 'degraded'
  const payload: Record<string, unknown> = {
    status: overall,
    timestamp,
    checks: { db: dbStatus },
  }
  if (dbError) {
    payload.error = dbError
  }
  return new Response(JSON.stringify(payload), {
    status: dbStatus === 'error' ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function measure<T>(
  timings: TimingEntry[],
  name: string,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()
  try {
    return await action()
  } finally {
    timings.push({
      name,
      durationMs: Math.max(0, performance.now() - startedAt),
    })
  }
}

function formatTimingDuration(durationMs: number): string {
  return Math.max(0, durationMs).toFixed(1)
}

function createRuntimeDiagnostics(): RuntimeDiagnostics {
  const now = Date.now()
  isolateRequestCount += 1
  const isolateIdleMs =
    lastRequestStartedAt === null ? null : Math.max(0, now - lastRequestStartedAt)
  lastRequestStartedAt = now

  return {
    isolateAgeMs: Math.max(0, now - isolateCreatedAt),
    isolateIdleMs,
    isolateRequestCount,
  }
}

function withTimingHeaders(
  response: Response,
  timings: TimingEntry[],
  requestStartedAt: number,
  runtime: RuntimeDiagnostics
): Response {
  const allTimings = [
    ...timings,
    {
      name: 'total',
      durationMs: Math.max(0, performance.now() - requestStartedAt),
    },
  ]
  if (!allTimings.length) return response

  const headers = new Headers(response.headers)
  const serverTiming = allTimings
    .map((entry) => `${entry.name};dur=${formatTimingDuration(entry.durationMs)}`)
    .join(', ')
  const existingServerTiming = headers.get('Server-Timing')
  headers.set(
    'Server-Timing',
    existingServerTiming ? `${existingServerTiming}, ${serverTiming}` : serverTiming
  )
  headers.set(
    'X-Flares3-Timing',
    allTimings
      .map((entry) => `${entry.name}=${formatTimingDuration(entry.durationMs)}ms`)
      .join('; ')
  )
  headers.set('X-Flares3-Isolate-Request', String(runtime.isolateRequestCount))
  headers.set('X-Flares3-Isolate-Cold', runtime.isolateRequestCount === 1 ? '1' : '0')
  headers.set('X-Flares3-Isolate-Age', `${formatTimingDuration(runtime.isolateAgeMs)}ms`)
  headers.set('X-Flares3-Isolate-Idle', `${formatTimingDuration(runtime.isolateIdleMs ?? 0)}ms`)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const requestStartedAt = performance.now()
  const runtimeDiagnostics = createRuntimeDiagnostics()
  const timings: TimingEntry[] = []
  requestIdMiddleware(request)
  let response: Response | undefined
  let requestError: unknown

  try {
    const pathname = new URL(request.url).pathname

    if (pathname === '/health' || pathname === '/api/health') {
      response = await measure(timings, 'health', () => healthResponse(env))
    } else if (!isBackendPath(pathname)) {
      response = await measure(timings, 'assets', () => handleFrontendRequest(request, env))
    } else {
      response = await measure(timings, 'rateLimit', () => rateLimitMiddleware(request, env))
      if (!response) {
        response = await measure(timings, 'bootstrap', () =>
          shouldRunBootstrapAdmin(request, pathname)
            ? bootstrapAdmin(request, env)
            : Promise.resolve<Response | undefined>(undefined)
        )
      }
      if (!response) {
        response = await measure(timings, 'auth', () => authSessionMiddleware(request, env))
      }
      if (!response) {
        response = await measure(timings, 'route', async () => {
          try {
            return await router.handle(request, env, ctx)
          } catch (error) {
            requestError = error
            return new Response('Internal Server Error', { status: 500 })
          }
        })
      }
    }
  } catch (error) {
    requestError = error
    response = new Response('Internal Server Error', { status: 500 })
  }

  if (!response) {
    response = new Response('Internal Server Error', { status: 500 })
  }

  response = withTimingHeaders(response, timings, requestStartedAt, runtimeDiagnostics)
  logRequestFailure(request, response, requestError)
  return withCommonHeaders(request, response)
}

export default {
  fetch: handleRequest,
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    const { handleScheduled } = await import('./scheduled')
    await handleScheduled(env)
  },
}
