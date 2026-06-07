import {
  MAX_UPSTREAM_ERROR_TEXT_BYTES,
  readBoundedResponseText as readBoundedUpstreamResponseText,
} from './upstreamResponsePolicy'

export const MAX_PREVIEW_RESPONSE_BYTES = 200 * 1024
export const MAX_PREVIEW_ERROR_TEXT_BYTES = MAX_UPSTREAM_ERROR_TEXT_BYTES

function limitReadableStream(
  source: ReadableStream<Uint8Array>,
  maxBytes: number
): ReadableStream<Uint8Array> {
  const reader = source.getReader()
  let remaining = maxBytes

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (remaining <= 0) {
        await reader.cancel().catch(() => undefined)
        controller.close()
        return
      }

      const result = await reader.read()
      if (result.done) {
        controller.close()
        return
      }

      const chunk = result.value
      if (chunk.byteLength <= remaining) {
        controller.enqueue(chunk)
        remaining -= chunk.byteLength
        return
      }

      controller.enqueue(chunk.slice(0, remaining))
      remaining = 0
      await reader.cancel().catch(() => undefined)
      controller.close()
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => undefined)
    },
  })
}

export function limitedPreviewResponse(
  response: Response,
  contentType: string,
  maxBytes: number = MAX_PREVIEW_RESPONSE_BYTES
): Response {
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  if (!response.body) {
    return new Response(null, { status: 200, headers })
  }

  return new Response(limitReadableStream(response.body, maxBytes), {
    status: 200,
    headers,
  })
}

export async function readBoundedResponseText(
  response: Response,
  maxBytes: number = MAX_PREVIEW_ERROR_TEXT_BYTES
): Promise<string> {
  return readBoundedUpstreamResponseText(response, maxBytes, '预览错误响应', { truncate: true })
}
