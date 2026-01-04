import type { AuthUser } from '../middleware/authSession'

export type AuthedRequest = Request & { user?: AuthUser; sessionId?: string }

export const MAX_PRESIGNED_DOWNLOAD_URL_TTL_SECONDS = 24 * 60 * 60

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function parseJson<T>(request: Request): Promise<T> {
  const text = await request.text()
  if (!text) {
    throw new Error('empty_body')
  }
  return JSON.parse(text) as T
}

export function getUser(request: Request): AuthUser | undefined {
  return (request as AuthedRequest).user
}

export function calcPresignedDownloadUrlTtlSeconds(
  expiresAt: Date,
  nowMs: number = Date.now()
): number {
  const expiresAtMs = expiresAt.getTime()
  if (!Number.isFinite(expiresAtMs)) {
    return MAX_PRESIGNED_DOWNLOAD_URL_TTL_SECONDS
  }
  const remainingMs = expiresAtMs - nowMs
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000))
  return Math.min(MAX_PRESIGNED_DOWNLOAD_URL_TTL_SECONDS, remainingSeconds)
}
