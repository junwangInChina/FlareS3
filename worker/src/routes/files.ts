import type { Env } from "../config/env";
import { jsonResponse, getUser } from "./utils";
import {
  extractR2ConfigIdFromKey,
  generateDownloadUrl,
  resolveR2ConfigForKey,
} from "../services/r2";
import { logAudit } from "../services/audit";
import { getClientIp } from "../middleware/rateLimit";

function formatDuration(ms: number): string {
  if (ms < 0) return "已过期";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const remMinutes = minutes % 60;
  if (days > 0) return `${days}天 ${remHours}小时 ${remMinutes}分钟`;
  if (hours > 0) return `${hours}小时 ${remMinutes}分钟`;
  return `${remMinutes}分钟`;
}

export async function listFiles(request: Request, env: Env): Promise<Response> {
  const user = getUser(request);
  if (!user) return jsonResponse({ error: "未授权" }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") || 20))
  );
  const scope = url.searchParams.get("scope");
  const offset = (page - 1) * limit;

  const params: unknown[] = [];
  let whereClause =
    "WHERE f.upload_status IN ('completed','deleted') AND f.deleted_at IS NULL";
  if (user.role !== "admin" || scope === "mine") {
    whereClause += " AND f.owner_id = ?";
    params.push(user.id);
  }

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM files f ${whereClause}`
  )
    .bind(...params)
    .first("total");
  const total = Number(totalRow || 0);

  const rows = await env.DB.prepare(
    `SELECT f.id, f.owner_id, u.username AS owner_username, f.filename, f.r2_key, f.size, f.content_type, f.expires_in, f.created_at, f.expires_at, f.upload_status, f.short_code, f.require_login
     FROM files f
     LEFT JOIN users u ON u.id = f.owner_id
     ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  const now = Date.now();
  const filesWithUrl = await Promise.all(
    (rows.results || []).map(async (row) => {
      const expiresAt = new Date(String(row.expires_at)).getTime();
      const remaining = formatDuration(expiresAt - now);
      let downloadUrl = "";
      const allowDirect = Number(row.require_login) === 0;

      if (allowDirect && row.upload_status === "completed" && now < expiresAt) {
        const loaded = await resolveR2ConfigForKey(env, String(row.r2_key));
        if (loaded) {
          try {
            const ttl = Math.max(60, Math.floor((expiresAt - now) / 1000));
            downloadUrl = await generateDownloadUrl(
              loaded.config,
              String(row.r2_key),
              String(row.filename),
              ttl
            );
          } catch (error) {
            downloadUrl = `/api/files/${row.id}/download`;
          }
        }
      }

      return {
        ...row,
        r2_config_id: extractR2ConfigIdFromKey(String(row.r2_key)),
        remaining_time: remaining,
        download_url: downloadUrl,
      };
    })
  );

  return jsonResponse({
    total,
    page,
    limit,
    files: filesWithUrl,
  });
}

export async function downloadFile(
  request: Request,
  env: Env,
  fileId: string
): Promise<Response> {
  const file = await env.DB.prepare(
    `SELECT id, filename, r2_key, expires_at, upload_status, require_login FROM files WHERE id = ? LIMIT 1`
  )
    .bind(fileId)
    .first();
  if (!file) {
    return jsonResponse({ error: "文件不存在" }, 404);
  }
  if (file.upload_status !== "completed") {
    return jsonResponse({ error: "文件未完成上传" }, 400);
  }
  const expiresAt = new Date(String(file.expires_at));
  if (Date.now() > expiresAt.getTime()) {
    return jsonResponse({ error: "文件已过期" }, 410);
  }
  const user = getUser(request);
  if (Number(file.require_login) === 1 && !user) {
    const next = encodeURIComponent(`/api/files/${fileId}/download`);
    return Response.redirect(`/login?next=${next}`, 302);
  }

  const loaded = await resolveR2ConfigForKey(env, String(file.r2_key));
  if (!loaded) return jsonResponse({ error: "R2 未配置" }, 503);

  const downloadUrl = await generateDownloadUrl(
    loaded.config,
    String(file.r2_key),
    String(file.filename),
    24 * 60 * 60
  );

  await logAudit(env.DB, {
    actorUserId: user?.id,
    action: "FILE_DOWNLOAD",
    targetType: "file",
    targetId: fileId,
    ip: getClientIp(request),
    userAgent: request.headers.get("User-Agent") || undefined,
    metadata: { require_login: Number(file.require_login) },
  });

  return Response.redirect(downloadUrl, 302);
}

export async function deleteFile(
  request: Request,
  env: Env,
  fileId: string
): Promise<Response> {
  const user = getUser(request);
  if (!user) return jsonResponse({ error: "未授权" }, 401);
  const file = await env.DB.prepare(
    "SELECT id, owner_id, r2_key FROM files WHERE id = ? LIMIT 1"
  )
    .bind(fileId)
    .first();
  if (!file) {
    return jsonResponse({ error: "文件不存在" }, 404);
  }
  if (user.role !== "admin" && file.owner_id !== user.id) {
    return jsonResponse({ error: "无权限" }, 403);
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE files SET upload_status = ?, deleted_at = ? WHERE id = ?"
  )
    .bind("deleted", now, fileId)
    .run();
  await env.DB.prepare(
    "INSERT INTO delete_queue (id, file_id, r2_key, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(crypto.randomUUID(), fileId, file.r2_key, now)
    .run();

  await logAudit(env.DB, {
    actorUserId: user.id,
    action: "FILE_DELETE",
    targetType: "file",
    targetId: fileId,
    ip: getClientIp(request),
    userAgent: request.headers.get("User-Agent") || undefined,
  });

  return jsonResponse({ success: true, queued: true });
}
