function getBasename(key) {
  const normalized = String(key || '').trim()
  if (!normalized) return ''
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

function getFilenameExtension(filename) {
  const name = String(filename || '').trim()
  const index = name.lastIndexOf('.')
  if (index <= 0 || index === name.length - 1) return ''
  return name.slice(index + 1).toLowerCase()
}

export function getMountedPreviewKind(objectKey) {
  const extension = getFilenameExtension(getBasename(objectKey))
  if (!extension) return null

  if (extension === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image'
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (['txt', 'log', 'csv', 'json', 'yml', 'yaml', 'ini', 'conf'].includes(extension)) return 'text'

  return null
}

export function shouldProbeMountedPreviewAvailability(kind) {
  return kind === 'image' || kind === 'pdf'
}
