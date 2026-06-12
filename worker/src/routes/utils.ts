import type { AuthUser } from '../middleware/authSession'
import {
  MAX_JSON_REQUEST_BODY_BYTES,
  readBoundedTextBody,
  requestBodyPolicyErrorResponse,
} from '../services/requestBodyPolicy'
import { jsonResponse } from '../utils/response'

export { jsonResponse }
export { requestBodyPolicyErrorResponse } from '../services/requestBodyPolicy'
export {
  calcPresignedDownloadUrlTtlSeconds,
  MAX_PRESIGNED_DOWNLOAD_URL_TTL_SECONDS,
} from '../services/presignedUrlTtl'

export type AuthedRequest = Request & { user?: AuthUser; sessionId?: string }

export function redirect(location: string, status: number = 302): Response {
  const headers = new Headers()
  headers.set('Location', location)
  return new Response(null, { status, headers })
}

export async function parseJson<T>(request: Request): Promise<T> {
  const text = await readBoundedTextBody(request, MAX_JSON_REQUEST_BODY_BYTES, 'JSON 请求体')
  if (!text) {
    throw new Error('empty_body')
  }
  return JSON.parse(text) as T
}

export function invalidJsonBodyResponse(error: unknown, fallbackMessage = '请求体无效'): Response {
  const policyResponse = requestBodyPolicyErrorResponse(error)
  if (policyResponse) return policyResponse
  return jsonResponse({ error: fallbackMessage }, 400)
}

export function getUser(request: Request): AuthUser | undefined {
  return (request as AuthedRequest).user
}
