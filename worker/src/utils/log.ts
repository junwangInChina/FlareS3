export type StructuredLogLevel = 'info' | 'error'

export function serializeError(error: unknown): string | undefined {
  if (!error) return
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

export function logStructured(level: StructuredLogLevel, payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload,
  })
  if (level === 'error') {
    console.error(line)
    return
  }
  console.info(line)
}

export function logRequestFailure(request: Request, response: Response, error?: unknown): void {
  if (response.status < 500) {
    return
  }

  const entry: Record<string, unknown> = {
    event: 'request.error',
    requestId: (request as Request & { requestId?: string }).requestId ?? null,
    method: request.method.toUpperCase(),
    path: new URL(request.url).pathname,
    status: response.status,
  }

  const serialized = serializeError(error)
  if (serialized) {
    entry.error = serialized
  }

  logStructured('error', entry)
}
