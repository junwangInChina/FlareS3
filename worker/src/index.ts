import { Router } from 'itty-router'
import type { Env } from './config/env'
import { requestIdMiddleware } from './middleware/requestId'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { bootstrapAdmin } from './middleware/bootstrapAdmin'
import { authSessionMiddleware } from './middleware/authSession'
import { requireAuth, requireAdmin } from './middleware/roleGuard'
import { login, logout, status as authStatus } from './routes/auth'
import { listUsers, createUser, updateUser, resetPassword, deleteUser } from './routes/users'
import {
  status as setupStatus,
  saveConfig as saveSetup,
  testConfig as testSetup,
} from './routes/setup'
import {
  listOptions as listR2Options,
  listConfigs as listR2Configs,
  createConfig as createR2Config,
  updateConfig as updateR2Config,
  deleteConfig as deleteR2Config,
  setDefault as setDefaultR2Config,
  setLegacyFiles as setLegacyFilesR2Config,
  testById as testR2Config,
} from './routes/r2Configs'
import {
  presignUpload,
  confirmUpload,
  initMultipart,
  presignMultipart,
  completeMultipart,
  abortMultipart,
} from './routes/upload'
import { listFiles, downloadFile, deleteFile, previewFile } from './routes/files'
import { listMountedObjects, downloadMountedObject, previewMountedObject } from './routes/mount'
import { shortlink } from './routes/shortlink'
import { getStats } from './routes/stats'
import { listAudit, deleteAudit, batchDeleteAudit } from './routes/audit'
import { listTexts, getText, createText, updateText, deleteText } from './routes/texts'
import { getTextShare, upsertTextShare, deleteTextShare, viewTextShare } from './routes/textShares'
import { createTextOneTimeShare } from './routes/textOneTimeShares'
import { getFileShare, upsertFileShare, deleteFileShare, viewFileShare } from './routes/fileShares'
import { cleanupExpired } from './jobs/cleanupExpired'
import { cleanupDeleteQueue } from './jobs/cleanupDeleteQueue'

const router = Router()

type RouteHandler = (request: Request, env: Env) => Response | Promise<Response>

function withAuth(handler: RouteHandler): RouteHandler {
  return (request, env) => {
    const auth = requireAuth(request)
    if (auth) return auth
    return handler(request, env)
  }
}

function withAdmin(handler: RouteHandler): RouteHandler {
  return (request, env) => {
    const auth = requireAdmin(request)
    if (auth) return auth
    return handler(request, env)
  }
}

router.post('/api/auth/login', (request, env: Env) => login(request, env))
router.post(
  '/api/auth/logout',
  withAuth((request, env: Env) => logout(request, env))
)
router.get(
  '/api/auth/status',
  withAuth((request, _env: Env) => authStatus(request))
)

router.get(
  '/api/users',
  withAdmin((request, env: Env) => listUsers(request, env))
)
router.post(
  '/api/users',
  withAdmin((request, env: Env) => createUser(request, env))
)
router.patch(
  '/api/users/:id',
  withAdmin((request, env: Env) => updateUser(request, env, (request as any).params.id))
)
router.post(
  '/api/users/:id/reset-password',
  withAdmin((request, env: Env) => resetPassword(request, env, (request as any).params.id))
)
router.delete(
  '/api/users/:id',
  withAdmin((request, env: Env) => deleteUser(request, env, (request as any).params.id))
)

router.get(
  '/api/setup/status',
  withAdmin((request, env: Env) => setupStatus(request, env))
)
router.post(
  '/api/setup/config',
  withAdmin((request, env: Env) => saveSetup(request, env))
)
router.post(
  '/api/setup/test',
  withAdmin((request, _env: Env) => testSetup(request))
)

router.get(
  '/api/r2/options',
  withAuth((request, env: Env) => listR2Options(request, env))
)
router.get(
  '/api/r2/configs',
  withAdmin((request, env: Env) => listR2Configs(request, env))
)
router.post(
  '/api/r2/configs',
  withAdmin((request, env: Env) => createR2Config(request, env))
)
router.patch(
  '/api/r2/configs/:id',
  withAdmin((request, env: Env) => updateR2Config(request, env, (request as any).params.id))
)
router.delete(
  '/api/r2/configs/:id',
  withAdmin((request, env: Env) => deleteR2Config(request, env, (request as any).params.id))
)
router.post(
  '/api/r2/configs/:id/test',
  withAdmin((request, env: Env) => testR2Config(request, env, (request as any).params.id))
)
router.post(
  '/api/r2/default',
  withAdmin((request, env: Env) => setDefaultR2Config(request, env))
)
router.post(
  '/api/r2/legacy-files',
  withAdmin((request, env: Env) => setLegacyFilesR2Config(request, env))
)

router.post(
  '/api/upload/presign',
  withAuth((request, env: Env) => presignUpload(request, env))
)
router.post(
  '/api/upload/confirm',
  withAuth((request, env: Env) => confirmUpload(request, env))
)
router.post(
  '/api/upload/multipart/init',
  withAuth((request, env: Env) => initMultipart(request, env))
)
router.post(
  '/api/upload/multipart/presign',
  withAuth((request, env: Env) => presignMultipart(request, env))
)
router.post(
  '/api/upload/multipart/complete',
  withAuth((request, env: Env) => completeMultipart(request, env))
)
router.post(
  '/api/upload/multipart/abort',
  withAuth((request, env: Env) => abortMultipart(request, env))
)

router.get(
  '/api/files',
  withAuth((request, env: Env) => listFiles(request, env))
)
router.delete(
  '/api/files/:id',
  withAuth((request, env: Env) => deleteFile(request, env, (request as any).params.id))
)
router.get(
  '/api/files/:id/preview',
  withAuth((request, env: Env) => previewFile(request, env, (request as any).params.id))
)
router.get('/api/files/:id/download', (request, env: Env) =>
  downloadFile(request, env, (request as any).params.id)
)

router.get(
  '/api/mount/objects',
  withAdmin((request, env: Env) => listMountedObjects(request, env))
)
router.get(
  '/api/mount/download',
  withAdmin((request, env: Env) => downloadMountedObject(request, env))
)
router.get(
  '/api/mount/preview',
  withAdmin((request, env: Env) => previewMountedObject(request, env))
)

router.get(
  '/api/files/:id/share',
  withAuth((request, env: Env) => getFileShare(request, env, (request as any).params.id))
)
router.post(
  '/api/files/:id/share',
  withAuth((request, env: Env) => upsertFileShare(request, env, (request as any).params.id))
)
router.delete(
  '/api/files/:id/share',
  withAuth((request, env: Env) => deleteFileShare(request, env, (request as any).params.id))
)

router.get(
  '/api/stats',
  withAuth((request, env: Env) => getStats(request, env))
)

router.get(
  '/api/audit',
  withAdmin((request, env: Env) => listAudit(request, env))
)
router.delete(
  '/api/audit/:id',
  withAdmin((request, env: Env) => deleteAudit(request, env, (request as any).params.id))
)
router.post(
  '/api/audit/batch-delete',
  withAdmin((request, env: Env) => batchDeleteAudit(request, env))
)

router.get(
  '/api/texts',
  withAuth((request, env: Env) => listTexts(request, env))
)
router.post(
  '/api/texts',
  withAuth((request, env: Env) => createText(request, env))
)
router.get(
  '/api/texts/:id',
  withAuth((request, env: Env) => getText(request, env, (request as any).params.id))
)
router.patch(
  '/api/texts/:id',
  withAuth((request, env: Env) => updateText(request, env, (request as any).params.id))
)
router.delete(
  '/api/texts/:id',
  withAuth((request, env: Env) => deleteText(request, env, (request as any).params.id))
)

router.get(
  '/api/texts/:id/share',
  withAuth((request, env: Env) => getTextShare(request, env, (request as any).params.id))
)
router.post(
  '/api/texts/:id/share',
  withAuth((request, env: Env) => upsertTextShare(request, env, (request as any).params.id))
)
router.delete(
  '/api/texts/:id/share',
  withAuth((request, env: Env) => deleteTextShare(request, env, (request as any).params.id))
)

router.post(
  '/api/texts/:id/one-time-share',
  withAuth((request, env: Env) => createTextOneTimeShare(request, env, (request as any).params.id))
)

router.get('/s/:code', (request, env: Env) => shortlink(request, env, (request as any).params.code))
router.post('/s/:code', (request, env: Env) =>
  shortlink(request, env, (request as any).params.code)
)
router.get('/t/:code', (request, env: Env) =>
  viewTextShare(request, env, (request as any).params.code)
)
router.post('/t/:code', (request, env: Env) =>
  viewTextShare(request, env, (request as any).params.code)
)
router.get('/f/:code', (request, env: Env) =>
  viewFileShare(request, env, (request as any).params.code)
)
router.post('/f/:code', (request, env: Env) =>
  viewFileShare(request, env, (request as any).params.code)
)

router.all('*', () => new Response('Not Found', { status: 404 }))

function isBackendPath(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/f/')
  )
}

function isHtmlNavigation(request: Request): boolean {
  const accept = request.headers.get('Accept') || ''
  return accept.includes('text/html')
}

async function handleFrontendRequest(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return new Response('Not Found', { status: 404 })
  }

  const response = await env.ASSETS.fetch(request)
  if (response.status !== 404) {
    return response
  }

  if (request.method.toUpperCase() !== 'GET') {
    return response
  }

  if (!isHtmlNavigation(request)) {
    return response
  }

  const url = new URL(request.url)
  url.pathname = '/index.html'
  return env.ASSETS.fetch(new Request(url.toString(), request))
}

function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get('Content-Type') || ''
  return contentType.toLowerCase().includes('text/html')
}

function buildHtmlCsp(): string {
  return [
    "default-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
    "frame-src 'self' https:",
    "object-src 'none'",
  ].join('; ')
}

function withCommonHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers)

  const requestId = (request as Request & { requestId?: string }).requestId
  if (requestId) {
    headers.set('X-Request-Id', requestId)
  }

  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'same-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  )
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  if (isHtmlResponse(response)) {
    headers.set('Content-Security-Policy', buildHtmlCsp())
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  requestIdMiddleware(request)
  const pathname = new URL(request.url).pathname

  if (!isBackendPath(pathname)) {
    const response = await handleFrontendRequest(request, env)
    return withCommonHeaders(request, response)
  }

  let response: Response | undefined = await rateLimitMiddleware(request, env)
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
      console.error('router.handle failed', error)
      response = new Response('Internal Server Error', { status: 500 })
    }
  }
  if (!response) {
    response = new Response('Internal Server Error', { status: 500 })
  }
  return withCommonHeaders(request, response)
}

async function handleScheduled(env: Env): Promise<void> {
  await cleanupExpired(env)
  await cleanupDeleteQueue(env)
}

export default {
  fetch: handleRequest,
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    await handleScheduled(env)
  },
}
