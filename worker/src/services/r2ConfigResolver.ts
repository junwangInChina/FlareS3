import type { Env } from '../config/env'
import {
  LEGACY_R2_CONFIG_ID,
  getLegacyFilesR2ConfigId,
  loadR2Config,
  loadR2ConfigById,
  type LoadedR2Config,
} from './r2ConfigRegistry'
import { extractR2ConfigIdFromKey } from './r2Keys'

export async function resolveR2ConfigForKey(
  env: Env,
  r2Key: string
): Promise<LoadedR2Config | null> {
  const configId = extractR2ConfigIdFromKey(r2Key)
  if (configId) {
    return loadR2ConfigById(env, configId)
  }

  const legacyFilesId = await getLegacyFilesR2ConfigId(env)
  if (legacyFilesId) {
    const loaded = await loadR2ConfigById(env, legacyFilesId)
    if (loaded) return loaded
  }

  const fallback = await loadR2Config(env)
  if (!fallback) {
    return loadR2ConfigById(env, LEGACY_R2_CONFIG_ID)
  }
  return fallback
}
