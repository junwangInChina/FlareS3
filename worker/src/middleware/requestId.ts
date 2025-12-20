export function requestIdMiddleware(request: Request): void {
  const req = request as Request & { requestId?: string }
  req.requestId = crypto.randomUUID()
}
