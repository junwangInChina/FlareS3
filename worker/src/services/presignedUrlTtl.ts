export const MAX_PRESIGNED_DOWNLOAD_URL_TTL_SECONDS = 24 * 60 * 60

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
