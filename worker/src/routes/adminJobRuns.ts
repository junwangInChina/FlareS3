import type { Env } from '../config/env'
import { listJobRuns } from '../services/jobRuns'
import { jsonResponse } from './utils'

export async function listAdminJobRuns(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') || 1)
  const limit = Number(url.searchParams.get('limit') || 20)
  return jsonResponse(await listJobRuns(env.DB, { page, limit }))
}
