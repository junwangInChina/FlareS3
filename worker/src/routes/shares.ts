import type { Env } from '../config/env'
import { listShareItems, type ShareRecordStatus, type ShareRecordType } from '../services/shares'
import { getUser, jsonResponse } from './utils'

type ShareListQuery = {
  page: number
  limit: number
  type: ShareRecordType | ''
  status: ShareRecordStatus | ''
  sort_by: string
  sort_order: string
  owner_id: string
  q: string
  expires_from: string
  expires_to: string
}

function normalizePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(1, Math.floor(parsed)))
}

function parseFilters(request: Request): ShareListQuery {
  const url = new URL(request.url)
  return {
    page: normalizePositiveInt(url.searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER),
    limit: normalizePositiveInt(url.searchParams.get('limit'), 20, 100),
    type: (url.searchParams.get('type') || '').trim() as ShareRecordType | '',
    status: (url.searchParams.get('status') || '').trim() as ShareRecordStatus | '',
    sort_by: (url.searchParams.get('sort_by') || '').trim(),
    sort_order: (url.searchParams.get('sort_order') || '').trim(),
    owner_id: (url.searchParams.get('owner_id') || '').trim(),
    q: (url.searchParams.get('q') || '').trim(),
    expires_from: (url.searchParams.get('expires_from') || '').trim(),
    expires_to: (url.searchParams.get('expires_to') || '').trim(),
  }
}

export async function listShares(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401)
  }

  const filters = parseFilters(request)
  const result = await listShareItems(env, user, filters)

  return jsonResponse({
    total: result.total,
    page: filters.page,
    limit: filters.limit,
    items: result.items,
  })
}
