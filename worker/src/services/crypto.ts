const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type Base64KeyValidationResult =
  | { valid: true; byteLength: number }
  | {
      valid: false
      reason: 'empty' | 'invalid_base64' | 'invalid_length'
      expectedByteLength: number
      byteLength?: number
    }

export function validateBase64KeyLength(
  base64Key: string,
  expectedByteLength = 32
): Base64KeyValidationResult {
  if (!base64Key) {
    return { valid: false, reason: 'empty', expectedByteLength }
  }

  try {
    const raw = base64ToBytes(base64Key)
    if (raw.length !== expectedByteLength) {
      return {
        valid: false,
        reason: 'invalid_length',
        expectedByteLength,
        byteLength: raw.length,
      }
    }
    return { valid: true, byteLength: raw.length }
  } catch {
    return { valid: false, reason: 'invalid_base64', expectedByteLength }
  }
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToBytes(base64Key)
  return crypto.subtle.importKey('raw', raw as unknown as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptString(plainText: string, base64Key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const key = await importKey(base64Key)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(plainText) as unknown as BufferSource
  )
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`
}

export async function decryptString(payload: string, base64Key: string): Promise<string> {
  const [ivPart, dataPart] = payload.split('.')
  if (!ivPart || !dataPart) {
    throw new Error('invalid_encrypted_payload')
  }
  const iv = base64ToBytes(ivPart)
  const data = base64ToBytes(dataPart)
  const key = await importKey(base64Key)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  )
  return decoder.decode(decrypted)
}
