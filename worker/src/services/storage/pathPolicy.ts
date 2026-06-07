export type StoragePathValidationResult = { ok: true; key: string } | { ok: false; message: string }
export type RemotePathValidationResult =
  | { ok: true; remotePath: string }
  | { ok: false; message: string }

type NormalizeOptions = {
  allowEmpty?: boolean
  allowTrailingSlash?: boolean
  forceTrailingSlash?: boolean
}

function hasControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export function normalizeStoragePath(
  value: unknown,
  options: NormalizeOptions = {}
): StoragePathValidationResult {
  const raw = String(value ?? '').trim()
  const allowEmpty = Boolean(options.allowEmpty)
  if (!raw) {
    if (allowEmpty) return { ok: true, key: '' }
    return { ok: false, message: '路径不能为空' }
  }

  if (raw.includes('\\')) {
    return { ok: false, message: '路径不能包含反斜杠' }
  }
  if (raw.startsWith('/')) {
    return { ok: false, message: '路径不能以 / 开头' }
  }
  if (raw.includes('//')) {
    return { ok: false, message: '路径不能包含空路径段' }
  }
  if (hasControlChars(raw)) {
    return { ok: false, message: '路径不能包含控制字符' }
  }

  const trailingSlash = raw.endsWith('/')
  if (trailingSlash && !options.allowTrailingSlash && !options.forceTrailingSlash) {
    return { ok: false, message: '路径不能以 / 结尾' }
  }

  const segments = raw.split('/').filter((segment) => segment.length > 0)
  if (!segments.length) {
    if (allowEmpty) return { ok: true, key: '' }
    return { ok: false, message: '路径不能为空' }
  }
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return { ok: false, message: '路径不能包含 . 或 ..' }
  }

  let key = segments.join('/')
  if ((options.forceTrailingSlash || trailingSlash) && key) {
    key = `${key}/`
  }
  return { ok: true, key }
}

export function normalizeStorageFilename(value: unknown): StoragePathValidationResult {
  const raw = String(value ?? '').trim()
  if (!raw) return { ok: false, message: '文件名不能为空' }
  if (raw.includes('/') || raw.includes('\\')) {
    return { ok: false, message: '文件名不能包含路径分隔符' }
  }
  if (raw === '.' || raw === '..') {
    return { ok: false, message: '文件名无效' }
  }
  if (hasControlChars(raw)) {
    return { ok: false, message: '文件名不能包含控制字符' }
  }
  return { ok: true, key: raw }
}

export function normalizeRemotePath(value: unknown): RemotePathValidationResult {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '/') {
    return { ok: true, remotePath: '/' }
  }

  if (raw.includes('\\')) {
    return { ok: false, message: '远程目录不能包含反斜杠' }
  }
  if (raw.includes('//')) {
    return { ok: false, message: '远程目录不能包含空路径段' }
  }
  if (hasControlChars(raw)) {
    return { ok: false, message: '远程目录不能包含控制字符' }
  }

  const withoutBoundarySlash = raw.replace(/^\/+|\/+$/g, '')
  if (!withoutBoundarySlash) {
    return { ok: true, remotePath: '/' }
  }

  const segments = withoutBoundarySlash.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return { ok: false, message: '远程目录不能包含 . 或 ..' }
  }

  return { ok: true, remotePath: `/${segments.join('/')}` }
}
