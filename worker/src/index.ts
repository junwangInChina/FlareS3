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
import { listFiles, downloadFile, deleteFile } from './routes/files'
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

router.post('/api/auth/login', (request, env: Env) => login(request, env))
router.post('/api/auth/logout', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return logout(request, env)
})
router.get('/api/auth/status', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return authStatus(request)
})

router.get('/api/users', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return listUsers(request, env)
})
router.post('/api/users', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return createUser(request, env)
})
router.patch('/api/users/:id', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return updateUser(request, env, (request as any).params.id)
})
router.post('/api/users/:id/reset-password', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return resetPassword(request, env, (request as any).params.id)
})
router.delete('/api/users/:id', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return deleteUser(request, env, (request as any).params.id)
})

router.get('/api/setup/status', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return setupStatus(request, env)
})
router.post('/api/setup/config', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return saveSetup(request, env)
})
router.post('/api/setup/test', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return testSetup(request)
})

router.get('/api/r2/options', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return listR2Options(request, env)
})
router.get('/api/r2/configs', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return listR2Configs(request, env)
})
router.post('/api/r2/configs', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return createR2Config(request, env)
})
router.patch('/api/r2/configs/:id', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return updateR2Config(request, env, (request as any).params.id)
})
router.delete('/api/r2/configs/:id', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return deleteR2Config(request, env, (request as any).params.id)
})
router.post('/api/r2/configs/:id/test', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return testR2Config(request, env, (request as any).params.id)
})
router.post('/api/r2/default', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return setDefaultR2Config(request, env)
})
router.post('/api/r2/legacy-files', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return setLegacyFilesR2Config(request, env)
})

router.post('/api/upload/presign', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return presignUpload(request, env)
})
router.post('/api/upload/confirm', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return confirmUpload(request, env)
})
router.post('/api/upload/multipart/init', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return initMultipart(request, env)
})
router.post('/api/upload/multipart/presign', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return presignMultipart(request, env)
})
router.post('/api/upload/multipart/complete', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return completeMultipart(request, env)
})
router.post('/api/upload/multipart/abort', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return abortMultipart(request, env)
})

router.get('/api/files', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return listFiles(request, env)
})
router.delete('/api/files/:id', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return deleteFile(request, env, (request as any).params.id)
})
router.get('/api/files/:id/download', (request, env: Env) =>
  downloadFile(request, env, (request as any).params.id)
)

router.get('/api/files/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return getFileShare(request, env, (request as any).params.id)
})
router.post('/api/files/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return upsertFileShare(request, env, (request as any).params.id)
})
router.delete('/api/files/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return deleteFileShare(request, env, (request as any).params.id)
})

router.get('/api/stats', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return getStats(request, env)
})

router.get('/api/audit', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return listAudit(request, env)
})
router.delete('/api/audit/:id', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return deleteAudit(request, env, (request as any).params.id)
})
router.post('/api/audit/batch-delete', (request, env: Env) => {
  const auth = requireAdmin(request)
  if (auth) return auth
  return batchDeleteAudit(request, env)
})

router.get('/api/texts', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return listTexts(request, env)
})
router.post('/api/texts', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return createText(request, env)
})
router.get('/api/texts/:id', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return getText(request, env, (request as any).params.id)
})
router.patch('/api/texts/:id', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return updateText(request, env, (request as any).params.id)
})
router.delete('/api/texts/:id', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return deleteText(request, env, (request as any).params.id)
})

router.get('/api/texts/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return getTextShare(request, env, (request as any).params.id)
})
router.post('/api/texts/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return upsertTextShare(request, env, (request as any).params.id)
})
router.delete('/api/texts/:id/share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return deleteTextShare(request, env, (request as any).params.id)
})

router.post('/api/texts/:id/one-time-share', (request, env: Env) => {
  const auth = requireAuth(request)
  if (auth) return auth
  return createTextOneTimeShare(request, env, (request as any).params.id)
})

router.get('/s/:code', (request, env: Env) => shortlink(request, env, (request as any).params.code))
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

function withRequestId(request: Request, response: Response): Response {
  const requestId = (request as Request & { requestId?: string }).requestId
  if (!requestId) return response
  const headers = new Headers(response.headers)
  headers.set('X-Request-Id', requestId)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  requestIdMiddleware(request)
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
  return withRequestId(request, response)
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
