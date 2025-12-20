import type { Env } from '../config/env'
import { jsonResponse, parseJson, getUser } from './utils'
import { hasEnvR2Config } from '../config/env'
import { encryptString } from '../services/crypto'
import { createS3Client, testConnection, type R2Config } from '../services/r2'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'

export async function status(request: Request, env: Env): Promise<Response> {
  if (hasEnvR2Config(env)) {
    return jsonResponse({
      configured: true,
      config_source: 'env',
      config: {
        endpoint: env.R2_ENDPOINT,
        bucket_name: env.R2_BUCKET
      }
    })
  }
  const endpoint = await env.DB.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_endpoint')
    .first('value')
  const bucketName = await env.DB.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_bucket_name')
    .first('value')
  if (!endpoint || !bucketName) {
    return jsonResponse({ configured: false })
  }
  return jsonResponse({
    configured: true,
    config_source: 'db',
    config: {
      endpoint,
      bucket_name: bucketName
    }
  })
}

export async function saveConfig(request: Request, env: Env): Promise<Response> {
  if (hasEnvR2Config(env)) {
    return jsonResponse({ error: '已使用环境变量配置，无法修改' }, 400)
  }
  if (!env.R2_MASTER_KEY) {
    return jsonResponse({ error: '缺少 R2_MASTER_KEY' }, 500)
  }
  try {
    const body = await parseJson<{ endpoint: string; access_key_id: string; secret_access_key: string; bucket_name: string }>(request)
    if (!body.endpoint || !body.access_key_id || !body.secret_access_key || !body.bucket_name) {
      return jsonResponse({ error: '所有字段都是必填的' }, 400)
    }
    const now = new Date().toISOString()
    const accessEnc = await encryptString(body.access_key_id, env.R2_MASTER_KEY)
    const secretEnc = await encryptString(body.secret_access_key, env.R2_MASTER_KEY)
    const statements = [
      ['r2_endpoint', body.endpoint],
      ['r2_bucket_name', body.bucket_name],
      ['r2_access_key_id_enc', accessEnc],
      ['r2_secret_access_key_enc', secretEnc]
    ]
    for (const [key, value] of statements) {
      await env.DB.prepare(
        `INSERT INTO system_config (key, value, updated_at)
         VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`
      )
        .bind(key, value, now, value, now)
        .run()
    }
    const actor = getUser(request)
    await logAudit(env.DB, {
      actorUserId: actor?.id,
      action: 'R2_CONFIG_UPDATE',
      targetType: 'system_config',
      targetId: 'r2_config',
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined
    })

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ error: '保存配置失败' }, 500)
  }
}

export async function testConfig(request: Request): Promise<Response> {
  try {
    const body = await parseJson<{ endpoint: string; access_key_id: string; secret_access_key: string; bucket_name: string }>(request)
    if (!body.endpoint || !body.access_key_id || !body.secret_access_key || !body.bucket_name) {
      return jsonResponse({ error: '所有字段都是必填的' }, 400)
    }
    const config: R2Config = {
      endpoint: body.endpoint,
      accessKeyId: body.access_key_id,
      secretAccessKey: body.secret_access_key,
      bucketName: body.bucket_name
    }
    createS3Client(config)
    await testConnection(config)
    return jsonResponse({ success: true, message: '连接测试成功' })
  } catch (error) {
    return jsonResponse({ success: false, message: '连接测试失败' }, 400)
  }
}
