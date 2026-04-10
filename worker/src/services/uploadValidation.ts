export type UploadedObjectSizeValidationResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID_ACTUAL_SIZE' | 'SIZE_MISMATCH' }

export function normalizeDeclaredFileSize(value: unknown): number | null {
  const size = Number(value)
  if (!Number.isFinite(size) || !Number.isInteger(size) || size <= 0) {
    return null
  }
  return size
}

export function validateUploadedObjectSize(
  expectedSize: number,
  actualSize: number
): UploadedObjectSizeValidationResult {
  if (!Number.isFinite(actualSize) || !Number.isInteger(actualSize) || actualSize < 0) {
    return { ok: false, reason: 'INVALID_ACTUAL_SIZE' }
  }

  if (actualSize !== expectedSize) {
    return { ok: false, reason: 'SIZE_MISMATCH' }
  }

  return { ok: true }
}
