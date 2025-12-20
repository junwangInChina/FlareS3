const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
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
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptString(plainText: string, base64Key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await importKey(base64Key)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText))
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
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return decoder.decode(decrypted)
}
