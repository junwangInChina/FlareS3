export type RouteTimingEntry = {
  name: string
  durationMs: number
}

export async function measureRouteStep<T>(
  timings: RouteTimingEntry[],
  name: string,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()
  try {
    return await action()
  } finally {
    timings.push({
      name,
      durationMs: Math.max(0, performance.now() - startedAt),
    })
  }
}

function formatTimingDuration(durationMs: number): string {
  return Math.max(0, durationMs).toFixed(1)
}

export function withRouteTimingHeaders(response: Response, timings: RouteTimingEntry[]): Response {
  if (!timings.length) return response

  const headers = new Headers(response.headers)
  const serverTiming = timings
    .map((entry) => `${entry.name};dur=${formatTimingDuration(entry.durationMs)}`)
    .join(', ')
  const existingServerTiming = headers.get('Server-Timing')
  headers.set(
    'Server-Timing',
    existingServerTiming ? `${existingServerTiming}, ${serverTiming}` : serverTiming
  )
  headers.set(
    'X-Flares3-Route-Timing',
    timings.map((entry) => `${entry.name}=${formatTimingDuration(entry.durationMs)}ms`).join('; ')
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
