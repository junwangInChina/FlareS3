function toMessage(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()
  return normalized || ''
}

export function resolveUploadErrorMessage(error, fallbackMessage) {
  const structuredMessage = toMessage(error?.response?.data?.error?.message)
  if (structuredMessage) {
    return structuredMessage
  }

  const legacyMessage = toMessage(error?.response?.data?.error)
  if (legacyMessage) {
    return legacyMessage
  }

  const runtimeMessage = toMessage(error?.message)
  if (runtimeMessage) {
    return runtimeMessage
  }

  return fallbackMessage
}
