const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateRandomCode(length: number, alphabet: string = DEFAULT_ALPHABET): string {
  const targetLength = Math.max(1, Math.floor(length))
  const chars = String(alphabet)
  if (chars.length < 2) {
    throw new Error('invalid_alphabet')
  }

  const maxByte = Math.floor(256 / chars.length) * chars.length
  let result = ''
  while (result.length < targetLength) {
    const remaining = targetLength - result.length
    const bytes = crypto.getRandomValues(new Uint8Array(Math.max(remaining * 2, 8)))
    for (const byte of bytes) {
      if (byte >= maxByte) continue
      result += chars[byte % chars.length]
      if (result.length >= targetLength) break
    }
  }
  return result
}
