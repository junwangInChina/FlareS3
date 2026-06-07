import { jsonResponse } from '../utils/response'

export const MAX_JSON_REQUEST_BODY_BYTES = 512 * 1024
export const MAX_SHARE_PASSWORD_FORM_BYTES = 16 * 1024

export class RequestBodyPolicyError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RequestBodyPolicyError'
    this.status = status
  }
}

export function isRequestBodyPolicyError(error: unknown): error is RequestBodyPolicyError {
  return error instanceof RequestBodyPolicyError
}

function parseContentLengthHeader(
  request: Request,
  maxBytes: number,
  label: string,
  options: { require: boolean }
): number | null {
  const raw = request.headers.get('Content-Length')
  if (!raw) {
    if (options.require) {
      throw new RequestBodyPolicyError(411, `${label}缺少 Content-Length`)
    }
    return null
  }

  const length = Number(raw)
  if (!Number.isFinite(length) || !Number.isInteger(length) || length < 0) {
    throw new RequestBodyPolicyError(400, `${label} Content-Length 无效`)
  }

  if (length > maxBytes) {
    throw new RequestBodyPolicyError(413, `${label}大小超过限制`)
  }

  return length
}

export function rejectInvalidContentLength(
  request: Request,
  maxBytes: number,
  label = '请求体'
): Response | null {
  try {
    parseContentLengthHeader(request, maxBytes, label, { require: true })
    return null
  } catch (error) {
    if (isRequestBodyPolicyError(error)) {
      return jsonResponse({ error: error.message }, error.status)
    }
    throw error
  }
}

export async function readBoundedTextBody(
  request: Request,
  maxBytes: number,
  label = '请求体'
): Promise<string> {
  parseContentLengthHeader(request, maxBytes, label, { require: false })

  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let receivedBytes = 0

  try {
    let readResult = await reader.read()
    while (!readResult.done) {
      const value = readResult.value

      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyPolicyError(413, `${label}大小超过限制`)
      }

      chunks.push(decoder.decode(value, { stream: true }))
      readResult = await reader.read()
    }
  } finally {
    reader.releaseLock()
  }

  chunks.push(decoder.decode())
  return chunks.join('')
}

export function requestBodyPolicyErrorResponse(error: unknown): Response | null {
  if (!isRequestBodyPolicyError(error)) return null
  return jsonResponse({ error: error.message }, error.status)
}
