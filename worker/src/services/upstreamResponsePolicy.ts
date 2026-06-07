export const MAX_UPSTREAM_ERROR_TEXT_BYTES = 4 * 1024
export const MAX_UPSTREAM_XML_RESPONSE_BYTES = 512 * 1024
export const MAX_UPSTREAM_JSON_RESPONSE_BYTES = 256 * 1024

export class UpstreamResponseBodyLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpstreamResponseBodyLimitError'
  }
}

export async function readBoundedResponseText(
  response: Response,
  maxBytes: number,
  label = '上游响应体',
  options: { truncate?: boolean } = {}
): Promise<string> {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let receivedBytes = 0

  try {
    let readResult = await reader.read()
    while (!readResult.done) {
      const value = readResult.value
      const nextBytes = receivedBytes + value.byteLength
      if (nextBytes > maxBytes) {
        if (options.truncate) {
          const remaining = Math.max(0, maxBytes - receivedBytes)
          if (remaining > 0) {
            chunks.push(decoder.decode(value.slice(0, remaining), { stream: true }))
          }
          await reader.cancel().catch(() => undefined)
          break
        }

        await reader.cancel().catch(() => undefined)
        throw new UpstreamResponseBodyLimitError(`${label}大小超过限制`)
      }

      chunks.push(decoder.decode(value, { stream: true }))
      receivedBytes = nextBytes

      if (receivedBytes === maxBytes) {
        const extra = await reader.read()
        if (!extra.done) {
          await reader.cancel().catch(() => undefined)
          if (!options.truncate) {
            throw new UpstreamResponseBodyLimitError(`${label}大小超过限制`)
          }
        }
        break
      }

      readResult = await reader.read()
    }
  } finally {
    reader.releaseLock()
  }

  chunks.push(decoder.decode())
  return chunks.join('')
}

export async function readBoundedResponseJson<T>(
  response: Response,
  maxBytes: number = MAX_UPSTREAM_JSON_RESPONSE_BYTES,
  label = '上游 JSON 响应'
): Promise<T> {
  const text = await readBoundedResponseText(response, maxBytes, label)
  return JSON.parse(text) as T
}
