import type { Env } from '../config/env'

function isHtmlNavigation(request: Request): boolean {
  const accept = request.headers.get('Accept') || ''
  return accept.includes('text/html')
}

export async function handleFrontendRequest(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return new Response('Not Found', { status: 404 })
  }

  const response = await env.ASSETS.fetch(request)
  if (response.status !== 404) {
    return response
  }

  if (request.method.toUpperCase() !== 'GET') {
    return response
  }

  if (!isHtmlNavigation(request)) {
    return response
  }

  const url = new URL(request.url)
  url.pathname = '/index.html'
  return env.ASSETS.fetch(new Request(url.toString(), request))
}
