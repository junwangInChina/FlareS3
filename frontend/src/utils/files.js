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

function normalizeText(value) {
  return String(value ?? '').trim()
}

export function formatFileBytes(bytes) {
  if (bytes === 0) return '0 B'

  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(k)))
  return `${Math.round((value / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

export function formatFileDateTime(isoString, locale) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale)
}

export function getFileExpiresText(row = {}, t = (key) => key) {
  const expiresIn = Number(row?.expires_in)
  if (!Number.isFinite(expiresIn)) return '-'
  return expiresIn === -30
    ? t('files.expires.seconds', { value: 30 })
    : t('files.expires.days', { days: expiresIn })
}

export function getFileRemainingText(row = {}, { isTrashMode = false } = {}) {
  if (isFileDeleted(row) || isTrashMode) return '-'
  const text = normalizeText(row?.remaining_time)
  return text || '-'
}

export function getFileDisplayStatus(row = {}, t = (key) => key, nowMs = Date.now()) {
  const { deleted, expired } = getFileStatusState(row, nowMs)
  const text = deleted
    ? t('files.status.invalid')
    : expired
      ? t('files.status.expired')
      : t('files.status.valid')
  const tagType = deleted ? 'danger' : expired ? 'warning' : 'success'

  return { deleted, expired, text, tagType }
}

export function toIsoStartOfDay(dateValue) {
  const normalized = normalizeText(dateValue)
  if (!normalized) return null

  const local = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(local.getTime())) return null
  return local.toISOString()
}

export function addOneDayIso(isoString) {
  const normalized = normalizeText(isoString)
  if (!normalized) return null

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

function applyFileDateRangeParams(params, filters = {}, { isTrash = false } = {}) {
  const createdFromDate = filters.created_from_date
  const createdToDate = filters.created_to_date

  if (!createdFromDate && !createdToDate) return

  let fromDate = createdFromDate
  let toDate = createdToDate

  if (fromDate && toDate && fromDate > toDate) {
    const earlierDate = toDate
    toDate = fromDate
    fromDate = earlierDate
  }

  const fromIso = fromDate ? toIsoStartOfDay(fromDate) : null
  const toBaseIso = toDate ? toIsoStartOfDay(toDate) : null
  const toIso = toBaseIso ? addOneDayIso(toBaseIso) : null

  const fromKey = isTrash ? 'deleted_from' : 'created_from'
  const toKey = isTrash ? 'deleted_to' : 'created_to'

  if (fromIso && toIso) {
    params[fromKey] = fromIso
    params[toKey] = toIso
    return
  }

  if (fromIso) {
    const singleTo = addOneDayIso(fromIso)
    if (singleTo) {
      params[fromKey] = fromIso
      params[toKey] = singleTo
    }
    return
  }

  if (toIso && toBaseIso) {
    params[fromKey] = toBaseIso
    params[toKey] = toIso
  }
}

export function buildFilesQueryParams(filters = {}, { mode = 'normal', isAdmin = false } = {}) {
  const params = {}
  const isTrash = mode === 'trash'

  const sortKey = filters.sort_key || (isTrash ? 'deleted_at__desc' : 'created_at__desc')
  const [sortBy, sortOrder] = String(sortKey).split('__')
  if (sortBy) params.sort_by = sortBy
  if (sortOrder) params.sort_order = sortOrder

  const filename = normalizeText(filters.filename)
  if (filename) params.filename = filename

  if (isAdmin && filters.owner_id) {
    params.owner_id = filters.owner_id
  }

  if (!isTrash && filters.upload_status) {
    params.upload_status = filters.upload_status
  }

  applyFileDateRangeParams(params, filters, { isTrash })

  return params
}
