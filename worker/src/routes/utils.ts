import type { AuthUser } from '../middleware/authSession'

export type AuthedRequest = Request & { user?: AuthUser; sessionId?: string }

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function parseJson<T>(request: Request): Promise<T> {
  const text = await request.text()
  if (!text) {
    throw new Error('empty_body')
  }
  return JSON.parse(text) as T
}

export function getUser(request: Request): AuthUser | undefined {
  return (request as AuthedRequest).user
}
