export function sanitizeFilename(filename: string): string {
  const normalized = String(filename ?? '').replaceAll('\\', '/')
  let withoutControls = ''
  for (const char of normalized) {
    const code = char.charCodeAt(0)
    withoutControls += code <= 0x1f || code === 0x7f ? '/' : char
  }
  const parts = withoutControls.split('/').filter(Boolean)
  const base = parts.length ? parts[parts.length - 1] : withoutControls
  const safe = String(base || '').trim()
  return safe || 'file'
}

export function sanitizeContentDispositionFilename(filename: string): string {
  return sanitizeFilename(filename).replaceAll('"', '')
}

export function extractR2ConfigIdFromKey(r2Key: string): string | null {
  const parts = r2Key.split('/').filter(Boolean)
  if (parts.length < 3) {
    return null
  }
  if (parts[0] !== 'flares3') {
    return null
  }
  return parts[1] || null
}

export function buildR2Key(configId: string, filename: string): string {
  const safeConfigId = String(configId).replaceAll('/', '_')
  const safeFilename = sanitizeFilename(filename)
  return `flares3/${safeConfigId}/${safeFilename}`
}
