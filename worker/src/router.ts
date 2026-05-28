import { Router } from 'itty-router'
import type { Env } from './config/env'
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
  listConfigs as listWebDAVConfigs,
  createConfig as createWebDAVConfig,
  updateConfig as updateWebDAVConfig,
  deleteConfig as deleteWebDAVConfig,
  testById as testWebDAVConfig,
} from './routes/webdavConfigs'
import {
  presignUpload,
  confirmUpload,
  initMultipart,
  presignMultipart,
  completeMultipart,
  abortMultipart,
  serverUpload,
} from './routes/upload'
import {
  listFiles,
  listTrashFiles,
  downloadFile,
  deleteFile,
  restoreFile,
  permanentlyDeleteFile,
  permanentlyDeleteTrashFiles,
  previewFile,
} from './routes/files'
import {
  listMountedObjects,
  downloadMountedObject,
  previewMountedObject,
  deleteMountedObject,
  uploadMountedObject,
  createMountedFolder,
} from './routes/mount'
import { shortlink } from './routes/shortlink'
import { getStats } from './routes/stats'
import { listAudit, deleteAudit, batchDeleteAudit } from './routes/audit'
import { getAdminOverview } from './routes/adminOverview'
import { listAdminJobRuns } from './routes/adminJobRuns'
import { listTexts, getText, createText, updateText, deleteText } from './routes/texts'
import { getTextShare, upsertTextShare, deleteTextShare, viewTextShare } from './routes/textShares'
import { listShares } from './routes/shares'
import { createTextOneTimeShare, deleteTextOneTimeShare } from './routes/textOneTimeShares'
import { getFileShare, upsertFileShare, deleteFileShare, viewFileShare } from './routes/fileShares'
import { listAllConfigs } from './routes/storageConfigs'

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

export const router = Router()

// ── Auth ──
router.post('/api/auth/login', (request, env: Env) => login(request, env))
router.post('/api/auth/logout', (request, env: Env) => logout(request, env))
router.get('/api/auth/status', withAuth((request, _env: Env) => authStatus(request)))

// ── Users ──
router.get('/api/users', withAdmin((request, env: Env) => listUsers(request, env)))
router.post('/api/users', withAdmin((request, env: Env) => createUser(request, env)))
router.patch('/api/users/:id', withAdmin((request, env: Env) => updateUser(request, env, (request as any).params.id)))
router.post('/api/users/:id/reset-password', withAdmin((request, env: Env) => resetPassword(request, env, (request as any).params.id)))
router.delete('/api/users/:id', withAdmin((request, env: Env) => deleteUser(request, env, (request as any).params.id)))

// ── Setup ──
router.get('/api/setup/status', withAdmin((request, env: Env) => setupStatus(request, env)))
router.post('/api/setup/config', withAdmin((request, env: Env) => saveSetup(request, env)))
router.post('/api/setup/test', withAdmin((request, _env: Env) => testSetup(request)))

// ── Storage configs ──
router.get('/api/storage/configs', withAdmin((request, env: Env) => listAllConfigs(request, env)))

// ── R2 configs ──
router.get('/api/r2/options', withAuth((request, env: Env) => listR2Options(request, env)))
router.get('/api/r2/configs', withAdmin((request, env: Env) => listR2Configs(request, env)))
router.post('/api/r2/configs', withAdmin((request, env: Env) => createR2Config(request, env)))
router.patch('/api/r2/configs/:id', withAdmin((request, env: Env) => updateR2Config(request, env, (request as any).params.id)))
router.delete('/api/r2/configs/:id', withAdmin((request, env: Env) => deleteR2Config(request, env, (request as any).params.id)))
router.post('/api/r2/configs/:id/test', withAdmin((request, env: Env) => testR2Config(request, env, (request as any).params.id)))
router.post('/api/r2/default', withAdmin((request, env: Env) => setDefaultR2Config(request, env)))
router.post('/api/r2/legacy-files', withAdmin((request, env: Env) => setLegacyFilesR2Config(request, env)))

// ── WebDAV configs ──
router.get('/api/webdav/configs', withAdmin((request, env: Env) => listWebDAVConfigs(request, env)))
router.post('/api/webdav/configs', withAdmin((request, env: Env) => createWebDAVConfig(request, env)))
router.patch('/api/webdav/configs/:id', withAdmin((request, env: Env) => updateWebDAVConfig(request, env, (request as any).params.id)))
router.delete('/api/webdav/configs/:id', withAdmin((request, env: Env) => deleteWebDAVConfig(request, env, (request as any).params.id)))
router.post('/api/webdav/configs/:id/test', withAdmin((request, env: Env) => testWebDAVConfig(request, env, (request as any).params.id)))

// ── Upload ──
router.post('/api/upload/presign', withAuth((request, env: Env) => presignUpload(request, env)))
router.post('/api/upload/confirm', withAuth((request, env: Env) => confirmUpload(request, env)))
router.post('/api/upload/multipart/init', withAuth((request, env: Env) => initMultipart(request, env)))
router.post('/api/upload/multipart/presign', withAuth((request, env: Env) => presignMultipart(request, env)))
router.post('/api/upload/multipart/complete', withAuth((request, env: Env) => completeMultipart(request, env)))
router.post('/api/upload/multipart/abort', withAuth((request, env: Env) => abortMultipart(request, env)))
router.post('/api/upload/server', withAuth((request, env: Env) => serverUpload(request, env)))

// ── Files ──
router.get('/api/files', withAuth((request, env: Env) => listFiles(request, env)))
router.get('/api/files/trash', withAuth((request, env: Env) => listTrashFiles(request, env)))
router.delete('/api/files/trash/permanent', withAuth((request, env: Env) => permanentlyDeleteTrashFiles(request, env)))
router.delete('/api/files/:id', withAuth((request, env: Env) => deleteFile(request, env, (request as any).params.id)))
router.post('/api/files/:id/restore', withAuth((request, env: Env) => restoreFile(request, env, (request as any).params.id)))
router.delete('/api/files/:id/permanent', withAuth((request, env: Env) => permanentlyDeleteFile(request, env, (request as any).params.id)))
router.get('/api/files/:id/preview', withAuth((request, env: Env) => previewFile(request, env, (request as any).params.id)))
router.get('/api/files/:id/download', (request, env: Env) => downloadFile(request, env, (request as any).params.id))

// ── Mount ──
router.get('/api/mount/objects', withAdmin((request, env: Env) => listMountedObjects(request, env)))
router.get('/api/mount/download', withAdmin((request, env: Env) => downloadMountedObject(request, env)))
router.get('/api/mount/preview', withAdmin((request, env: Env) => previewMountedObject(request, env)))
router.delete('/api/mount/object', withAdmin((request, env: Env) => deleteMountedObject(request, env)))
router.post('/api/mount/upload', withAdmin((request, env: Env) => uploadMountedObject(request, env)))
router.post('/api/mount/folder', withAdmin((request, env: Env) => createMountedFolder(request, env)))

// ── File shares ──
router.get('/api/files/:id/share', withAuth((request, env: Env) => getFileShare(request, env, (request as any).params.id)))
router.post('/api/files/:id/share', withAuth((request, env: Env) => upsertFileShare(request, env, (request as any).params.id)))
router.delete('/api/files/:id/share', withAuth((request, env: Env) => deleteFileShare(request, env, (request as any).params.id)))

// ── Shares ──
router.get('/api/shares', withAuth((request, env: Env) => listShares(request, env)))

// ── Stats ──
router.get('/api/stats', withAuth((request, env: Env) => getStats(request, env)))

// ── Admin ──
router.get('/api/admin/overview', withAdmin((request, env: Env) => getAdminOverview(request, env)))
router.get('/api/admin/job-runs', withAdmin((request, env: Env) => listAdminJobRuns(request, env)))

// ── Audit ──
router.get('/api/audit', withAdmin((request, env: Env) => listAudit(request, env)))
router.delete('/api/audit/:id', withAdmin((request, env: Env) => deleteAudit(request, env, (request as any).params.id)))
router.post('/api/audit/batch-delete', withAdmin((request, env: Env) => batchDeleteAudit(request, env)))

// ── Texts ──
router.get('/api/texts', withAuth((request, env: Env) => listTexts(request, env)))
router.post('/api/texts', withAuth((request, env: Env) => createText(request, env)))
router.get('/api/texts/:id', withAuth((request, env: Env) => getText(request, env, (request as any).params.id)))
router.patch('/api/texts/:id', withAuth((request, env: Env) => updateText(request, env, (request as any).params.id)))
router.delete('/api/texts/:id', withAuth((request, env: Env) => deleteText(request, env, (request as any).params.id)))

// ── Text shares ──
router.get('/api/texts/:id/share', withAuth((request, env: Env) => getTextShare(request, env, (request as any).params.id)))
router.post('/api/texts/:id/share', withAuth((request, env: Env) => upsertTextShare(request, env, (request as any).params.id)))
router.delete('/api/texts/:id/share', withAuth((request, env: Env) => deleteTextShare(request, env, (request as any).params.id)))

// ── Text one-time shares ──
router.post('/api/texts/:id/one-time-share', withAuth((request, env: Env) => createTextOneTimeShare(request, env, (request as any).params.id)))
router.delete('/api/texts/:id/one-time-share', withAuth((request, env: Env) => deleteTextOneTimeShare(request, env, (request as any).params.id)))

// ── Public share pages ──
router.get('/s/:code', (request, env: Env) => shortlink(request, env, (request as any).params.code))
router.post('/s/:code', (request, env: Env) => shortlink(request, env, (request as any).params.code))
router.get('/t/:code', (request, env: Env) => viewTextShare(request, env, (request as any).params.code))
router.post('/t/:code', (request, env: Env) => viewTextShare(request, env, (request as any).params.code))
router.get('/f/:code', (request, env: Env) => viewFileShare(request, env, (request as any).params.code))
router.post('/f/:code', (request, env: Env) => viewFileShare(request, env, (request as any).params.code))

// ── Catch-all ──
router.all('*', () => new Response('Not Found', { status: 404 }))
