import type { Env } from './config/env'
import { requestIdMiddleware } from './middleware/requestId'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { bootstrapAdmin } from './middleware/bootstrapAdmin'
import { authSessionMiddleware } from './middleware/authSession'
import { withCommonHeaders } from './middleware/securityHeaders'
import { handleFrontendRequest } from './middleware/assets'
import { router } from './router'
import { handleScheduled } from './scheduled'
import { serializeError, logRequestFailure } from './utils/log'

function isBackendPath(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/f/')
  )
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

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  requestIdMiddleware(request)
  let response: Response | undefined
  let requestError: unknown

  try {
    const pathname = new URL(request.url).pathname

    if (pathname === '/health' || pathname === '/api/health') {
      response = await healthResponse(env)
    } else if (!isBackendPath(pathname)) {
      response = await handleFrontendRequest(request, env)
    } else {
      response = await rateLimitMiddleware(request, env)
      if (!response) {
        response = await bootstrapAdmin(request, env)
      }
      if (!response) {
        response = await authSessionMiddleware(request, env)
      }
      if (!response) {
        try {
          response = await router.handle(request, env, ctx)
        } catch (error) {
          requestError = error
          response = new Response('Internal Server Error', { status: 500 })
        }
      }
    }
  } catch (error) {
    requestError = error
    response = new Response('Internal Server Error', { status: 500 })
  }

  if (!response) {
    response = new Response('Internal Server Error', { status: 500 })
  }

  logRequestFailure(request, response, requestError)
  return withCommonHeaders(request, response)
}

export default {
  fetch: handleRequest,
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    await handleScheduled(env)
  },
}
