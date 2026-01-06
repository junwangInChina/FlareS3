export type Env = {
  DB: D1Database
  MAX_FILE_SIZE?: string
  TOTAL_STORAGE?: string
  BOOTSTRAP_ADMIN_USER?: string
  BOOTSTRAP_ADMIN_PASS?: string
  R2_ENDPOINT?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_BUCKET?: string
  R2_MASTER_KEY?: string
}

export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024
export const DEFAULT_TOTAL_STORAGE = 10 * 1024 * 1024 * 1024

export function getMaxFileSize(env: Env): number {
  const value = Number(env.MAX_FILE_SIZE)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_FILE_SIZE
}

export function getTotalStorage(env: Env): number {
  const value = Number(env.TOTAL_STORAGE)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TOTAL_STORAGE
}

export function hasEnvR2Config(env: Env): boolean {
  return Boolean(
    env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET
  )
}
