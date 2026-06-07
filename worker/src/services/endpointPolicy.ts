export type EndpointValidationResult = { ok: true; url: string } | { ok: false; message: string }

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
])

const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal', '.lan']

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4) return false

  const nums = parts.map((part) => {
    if (!/^\d+$/.test(part)) return Number.NaN
    return Number(part)
  })
  if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) return false

  const [a, b, c] = nums
  if (a === 0) return true
  if (a === 10) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true
  if (a >= 224) return true
  return false
}

function parseHextet(value: string): number | null {
  if (!/^[0-9a-f]{1,4}$/i.test(value)) return null
  const parsed = Number.parseInt(value, 16)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0xffff ? parsed : null
}

function ipv4FromHextets(high: number, low: number): string {
  return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.')
}

function extractIpv4MappedAddress(hostname: string): string | null {
  const normalized = hostname.toLowerCase()
  const mappedPrefixes = ['::ffff:', '0:0:0:0:0:ffff:']
  const prefix = mappedPrefixes.find((candidate) => normalized.startsWith(candidate))
  if (!prefix) return null

  const tail = normalized.slice(prefix.length)
  if (tail.includes('.')) return tail

  const parts = tail.split(':')
  if (parts.length !== 2) return null

  const high = parseHextet(parts[0])
  const low = parseHextet(parts[1])
  if (high === null || low === null) return null

  return ipv4FromHextets(high, low)
}

function getFirstIpv6Hextet(hostname: string): number | null {
  const first = hostname.startsWith('::') ? '0' : hostname.split(':')[0]
  return parseHextet(first || '0')
}

function isBlockedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  if (!normalized.includes(':')) return false

  const mappedIpv4 = extractIpv4MappedAddress(normalized)
  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4)
  }

  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('2001:db8:') ||
    normalized === '2001:db8' ||
    normalized.startsWith('2001:2:') ||
    normalized === '2001:2'
  ) {
    return true
  }

  const first = getFirstIpv6Hextet(normalized)
  if (first === null) return true
  if ((first & 0xfe00) === 0xfc00) return true
  if ((first & 0xffc0) === 0xfe80) return true
  if ((first & 0xff00) === 0xff00) return true

  return false
}

function isBlockedHostname(hostname: string): boolean {
  if (!hostname) return true
  if (BLOCKED_HOSTNAMES.has(hostname)) return true
  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true
  if (isPrivateIpv4(hostname)) return true
  if (isBlockedIpv6(hostname)) return true
  return false
}

export function validateExternalEndpoint(endpoint: unknown): EndpointValidationResult {
  const raw = String(endpoint || '').trim()
  if (!raw) {
    return { ok: false, message: 'endpoint 不能为空' }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, message: 'endpoint 不是合法 URL' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, message: 'endpoint 必须使用 https' }
  }

  const hostname = normalizeHostname(url.hostname)
  if (isBlockedHostname(hostname)) {
    return { ok: false, message: 'endpoint 不能指向本机、内网或保留地址' }
  }

  return { ok: true, url: url.toString().replace(/\/$/, '') }
}
