const GIGABYTE_BYTES = 1024 * 1024 * 1024

export function quotaGigabytesToBytes(value) {
  const numeric = Number(String(value ?? '').trim())
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }

  const bytes = Math.round(numeric * GIGABYTE_BYTES)
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    return null
  }

  return bytes
}

export function quotaBytesToGigabytesInput(bytes) {
  const numeric = Number(bytes)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '10'
  }

  const quotaGb = Math.round((numeric / GIGABYTE_BYTES) * 100) / 100
  return Number.isInteger(quotaGb) ? String(quotaGb) : String(quotaGb)
}

export function createUserEditForm(user = {}) {
  return {
    username: String(user.username ?? ''),
    role: user.role === 'admin' ? 'admin' : 'user',
    status: String(user.status ?? 'active') || 'active',
    quota_gb: quotaBytesToGigabytesInput(user.quota_bytes),
  }
}

export function buildUserEditPayload(initialUser = {}, form = {}) {
  const payload = {}

  const initialRole = initialUser.role === 'admin' ? 'admin' : 'user'
  const nextRole = form.role === 'admin' ? 'admin' : 'user'
  if (nextRole !== initialRole) {
    payload.role = nextRole
  }

  const initialStatus = String(initialUser.status ?? '')
  const nextStatus = String(form.status ?? initialStatus)
  if (nextStatus && nextStatus !== initialStatus) {
    payload.status = nextStatus
  }

  const nextQuotaBytes = quotaGigabytesToBytes(form.quota_gb)
  if (nextQuotaBytes === null) {
    return {
      ...payload,
      quota_bytes: null,
    }
  }

  const initialQuotaBytes = Number(initialUser.quota_bytes ?? 0)
  if (nextQuotaBytes !== initialQuotaBytes) {
    payload.quota_bytes = nextQuotaBytes
  }

  return payload
}
