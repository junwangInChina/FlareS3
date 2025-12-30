export function formatBytes(bytes: number): string {
  const unit = 1024
  const value = Number(bytes)
  const safe = Number.isFinite(value) ? value : 0
  if (safe < unit) return `${safe} B`
  let div = unit
  let exp = 0
  while (safe / div >= unit && exp < 4) {
    div *= unit
    exp += 1
  }
  const scaled = safe / div
  const suffix = ['KB', 'MB', 'GB', 'TB', 'PB'][exp]
  return `${scaled.toFixed(2)} ${suffix}`
}
