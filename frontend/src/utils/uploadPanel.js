export const createCancelledError = () => new Error('UPLOAD_CANCELLED')

export const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'CanceledError' ||
  error?.message === 'UPLOAD_CANCELLED'

export const formatBytes = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const unit = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(unit)), sizes.length - 1)
  return `${(value / Math.pow(unit, index)).toFixed(2)} ${sizes[index]}`
}

const resolveSameOriginUrl = (value, fallbackPath = '') => {
  const raw = String(value || '').trim()
  const path = raw.startsWith('/') && !raw.startsWith('//') ? raw : fallbackPath
  if (!path) return ''
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export const resolveDownloadUrl = (value, fallbackPath = '') => {
  const raw = String(value || '').trim()
  if (raw) {
    if (raw.startsWith('/') && !raw.startsWith('//')) {
      return resolveSameOriginUrl(raw)
    }
    try {
      const url = new URL(raw)
      if (url.protocol === 'https:') {
        return url.toString()
      }
    } catch {
      // Fall through to the authenticated app download URL.
    }
  }
  return resolveSameOriginUrl(fallbackPath)
}

export const resolveShortUrl = (value) => {
  const raw = String(value || '').trim()
  if (raw.startsWith('/s/') && !raw.startsWith('//')) {
    return resolveSameOriginUrl(raw)
  }
  return ''
}
