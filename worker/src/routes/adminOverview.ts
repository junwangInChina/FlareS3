import type { Env } from '../config/env'
import { getAdminOverviewData } from '../services/adminOverview'
import { jsonResponse } from './utils'

export async function getAdminOverview(_request: Request, env: Env): Promise<Response> {
  return jsonResponse(await getAdminOverviewData(env))
}
