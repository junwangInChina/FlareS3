export function isFileDeleted(row = {}) {
  return String(row?.upload_status ?? '').trim() === 'deleted'
}

export function getFileStatusState(row = {}, nowMs = Date.now()) {
  const deleted = isFileDeleted(row)
  const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : Number.NaN
  const expired = !deleted && Number.isFinite(expiresAtMs) && nowMs > expiresAtMs

  return { deleted, expired }
}

export function canManageFileShare(row = {}, nowMs = Date.now()) {
  const { deleted, expired } = getFileStatusState(row, nowMs)
  return !deleted && !expired
}
