import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../config/env";
import { hasEnvR2Config } from "../config/env";
import { decryptString } from "./crypto";
export const ENV_R2_CONFIG_ID = "env";
export const LEGACY_R2_CONFIG_ID = "legacy";
export const SYSTEM_DEFAULT_R2_CONFIG_ID_KEY = "r2_default_config_id";
export const SYSTEM_LEGACY_FILES_CONFIG_ID_KEY = "r2_legacy_files_config_id";

export type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export type R2ConfigSource = "env" | "legacy" | "db";

export type LoadedR2Config = {
  id: string;
  source: R2ConfigSource;
  config: R2Config;
};

export type R2ConfigOption = {
  id: string;
  name: string;
  source: R2ConfigSource;
};

export type R2ConfigSummary = {
  id: string;
  name: string;
  source: R2ConfigSource;
  endpoint: string;
  bucketName: string;
  createdAt?: string;
  updatedAt?: string;
};

async function ensureR2ConfigsTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS r2_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      bucket_name TEXT NOT NULL,
      access_key_id_enc TEXT NOT NULL,
      secret_access_key_enc TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )`
    )
    .run();

  await db
    .prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_r2_configs_name ON r2_configs(name)"
    )
    .run();
}

export async function ensureR2ConfigStorage(env: Env): Promise<void> {
  await ensureR2ConfigsTable(env.DB);
}

async function getSystemConfigValue(
  db: D1Database,
  key: string
): Promise<string | null> {
  const value = await db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind(key)
    .first("value");
  return value ? String(value) : null;
}

async function setSystemConfigValue(
  db: D1Database,
  key: string,
  value: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO system_config (key, value, updated_at)
     VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`
    )
    .bind(key, value, now, value, now)
    .run();
}

export async function getDefaultR2ConfigId(env: Env): Promise<string | null> {
  return getSystemConfigValue(env.DB, SYSTEM_DEFAULT_R2_CONFIG_ID_KEY);
}

export async function setDefaultR2ConfigId(
  env: Env,
  id: string
): Promise<void> {
  await setSystemConfigValue(env.DB, SYSTEM_DEFAULT_R2_CONFIG_ID_KEY, id);
}

export async function getLegacyFilesR2ConfigId(
  env: Env
): Promise<string | null> {
  return getSystemConfigValue(env.DB, SYSTEM_LEGACY_FILES_CONFIG_ID_KEY);
}

export async function setLegacyFilesR2ConfigId(
  env: Env,
  id: string | null
): Promise<void> {
  if (!id) {
    await env.DB.prepare("DELETE FROM system_config WHERE key = ?")
      .bind(SYSTEM_LEGACY_FILES_CONFIG_ID_KEY)
      .run();
    return;
  }
  await setSystemConfigValue(env.DB, SYSTEM_LEGACY_FILES_CONFIG_ID_KEY, id);
}

async function getLegacyDbConfig(
  db: D1Database,
  masterKey: string
): Promise<R2Config | null> {
  const endpoint = await db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind("r2_endpoint")
    .first("value");
  if (!endpoint) {
    return null;
  }
  const bucketName = await db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind("r2_bucket_name")
    .first("value");
  const accessKeyEnc = await db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind("r2_access_key_id_enc")
    .first("value");
  const secretKeyEnc = await db
    .prepare("SELECT value FROM system_config WHERE key = ?")
    .bind("r2_secret_access_key_enc")
    .first("value");
  if (!bucketName || !accessKeyEnc || !secretKeyEnc) {
    return null;
  }
  const accessKeyId = await decryptString(String(accessKeyEnc), masterKey);
  const secretAccessKey = await decryptString(String(secretKeyEnc), masterKey);
  return {
    endpoint: String(endpoint),
    accessKeyId,
    secretAccessKey,
    bucketName: String(bucketName),
  };
}

async function getDbConfigById(
  db: D1Database,
  masterKey: string,
  id: string
): Promise<R2Config | null> {
  await ensureR2ConfigsTable(db);
  const row = await db
    .prepare(
      "SELECT endpoint, bucket_name, access_key_id_enc, secret_access_key_enc FROM r2_configs WHERE id = ? LIMIT 1"
    )
    .bind(id)
    .first<{
      endpoint: string;
      bucket_name: string;
      access_key_id_enc: string;
      secret_access_key_enc: string;
    }>();
  if (!row) {
    return null;
  }
  const accessKeyId = await decryptString(
    String(row.access_key_id_enc),
    masterKey
  );
  const secretAccessKey = await decryptString(
    String(row.secret_access_key_enc),
    masterKey
  );
  return {
    endpoint: String(row.endpoint),
    accessKeyId,
    secretAccessKey,
    bucketName: String(row.bucket_name),
  };
}

export async function listDbR2Configs(
  db: D1Database
): Promise<R2ConfigSummary[]> {
  await ensureR2ConfigsTable(db);
  const rows = await db
    .prepare(
      "SELECT id, name, endpoint, bucket_name, created_at, updated_at FROM r2_configs ORDER BY created_at DESC"
    )
    .all<{
      id: string;
      name: string;
      endpoint: string;
      bucket_name: string;
      created_at: string;
      updated_at: string;
    }>();
  return (rows.results || []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    source: "db",
    endpoint: String(row.endpoint),
    bucketName: String(row.bucket_name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function loadR2ConfigById(
  env: Env,
  id: string
): Promise<LoadedR2Config | null> {
  if (id === ENV_R2_CONFIG_ID) {
    if (!hasEnvR2Config(env)) return null;
    return {
      id: ENV_R2_CONFIG_ID,
      source: "env",
      config: {
        endpoint: env.R2_ENDPOINT as string,
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        bucketName: env.R2_BUCKET as string,
      },
    };
  }

  if (!env.R2_MASTER_KEY) {
    return null;
  }

  if (id === LEGACY_R2_CONFIG_ID) {
    const legacy = await getLegacyDbConfig(env.DB, env.R2_MASTER_KEY);
    if (!legacy) return null;
    return { id: LEGACY_R2_CONFIG_ID, source: "legacy", config: legacy };
  }

  const dbConfig = await getDbConfigById(env.DB, env.R2_MASTER_KEY, id);
  if (!dbConfig) {
    return null;
  }
  return { id, source: "db", config: dbConfig };
}

export async function loadR2Config(env: Env): Promise<LoadedR2Config | null> {
  const configuredDefault = await getDefaultR2ConfigId(env);
  if (configuredDefault) {
    const loaded = await loadR2ConfigById(env, configuredDefault);
    if (loaded) return loaded;
  }

  if (hasEnvR2Config(env)) {
    return loadR2ConfigById(env, ENV_R2_CONFIG_ID);
  }

  if (!env.R2_MASTER_KEY) {
    return null;
  }

  const legacyFilesConfigId = await getSystemConfigValue(
    env.DB,
    SYSTEM_LEGACY_FILES_CONFIG_ID_KEY
  );
  if (legacyFilesConfigId) {
    const loaded = await loadR2ConfigById(env, legacyFilesConfigId);
    if (loaded) return loaded;
  }

  const legacy = await loadR2ConfigById(env, LEGACY_R2_CONFIG_ID);
  if (legacy) return legacy;

  const configs = await listDbR2Configs(env.DB);
  for (const config of configs) {
    const loaded = await loadR2ConfigById(env, config.id);
    if (loaded) return loaded;
  }

  return null;
}
export async function listR2ConfigOptions(env: Env): Promise<{
  default_config_id: string | null;
  legacy_files_config_id: string | null;
  options: R2ConfigOption[];
}> {
  const options: R2ConfigOption[] = [];

  if (hasEnvR2Config(env)) {
    options.push({ id: ENV_R2_CONFIG_ID, name: "环境变量", source: "env" });
  }

  if (env.R2_MASTER_KEY) {
    const legacy = await getLegacyDbConfig(env.DB, env.R2_MASTER_KEY);
    if (legacy) {
      options.push({
        id: LEGACY_R2_CONFIG_ID,
        name: "旧版配置",
        source: "legacy",
      });
    }

    const configs = await listDbR2Configs(env.DB);
    for (const cfg of configs) {
      options.push({ id: cfg.id, name: cfg.name, source: "db" });
    }
  }

  let defaultId = await getDefaultR2ConfigId(env);
  if (defaultId) {
    const loaded = await loadR2ConfigById(env, defaultId);
    if (!loaded) {
      defaultId = null;
    }
  }

  if (!defaultId) {
    const fallback = await loadR2Config(env);
    defaultId = fallback?.id || null;
  }

  let legacyFilesId = await getSystemConfigValue(
    env.DB,
    SYSTEM_LEGACY_FILES_CONFIG_ID_KEY
  );

  if (legacyFilesId) {
    const loaded = await loadR2ConfigById(env, legacyFilesId);
    if (!loaded) {
      legacyFilesId = null;
    }
  }

  return {
    default_config_id: defaultId,
    legacy_files_config_id: legacyFilesId,
    options,
  };
}

export function extractR2ConfigIdFromKey(r2Key: string): string | null {
  const parts = r2Key.split("/").filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  if (parts[0] !== "flares3") {
    return null;
  }
  return parts[1] || null;
}

export function buildR2Key(
  configId: string,
  fileId: string,
  extension: string
): string {
  const safeConfigId = String(configId).replaceAll("/", "_");
  const safeExt = extension || "";
  return `flares3/${safeConfigId}/${fileId}${safeExt}`;
}

export async function resolveR2ConfigForKey(
  env: Env,
  r2Key: string
): Promise<LoadedR2Config | null> {
  const configId = extractR2ConfigIdFromKey(r2Key);
  if (configId) {
    return loadR2ConfigById(env, configId);
  }

  const legacyFilesId = await getLegacyFilesR2ConfigId(env);
  if (legacyFilesId) {
    const loaded = await loadR2ConfigById(env, legacyFilesId);
    if (loaded) return loaded;
  }

  const fallback = await loadR2Config(env);
  if (!fallback) {
    return loadR2ConfigById(env, LEGACY_R2_CONFIG_ID);
  }
  return fallback;
}

export function createS3Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function generateUploadUrl(
  config: R2Config,
  key: string,
  contentType: string,
  expiresInSeconds: number
): Promise<string> {
  const client = createS3Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function generateDownloadUrl(
  config: R2Config,
  key: string,
  filename: string,
  expiresInSeconds: number
): Promise<string> {
  const client = createS3Client(config);
  const contentDisposition = `attachment; filename=\"${filename}\"`;
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ResponseContentDisposition: contentDisposition,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function initiateMultipartUpload(
  config: R2Config,
  key: string,
  contentType: string
): Promise<string> {
  const client = createS3Client(config);
  const output = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: contentType,
    })
  );
  if (!output.UploadId) {
    throw new Error("missing_upload_id");
  }
  return output.UploadId;
}

export async function generateMultipartUploadUrl(
  config: R2Config,
  key: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds: number
): Promise<string> {
  const client = createS3Client(config);
  const command = new UploadPartCommand({
    Bucket: config.bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function listParts(
  config: R2Config,
  key: string,
  uploadId: string
) {
  const client = createS3Client(config);
  const output = await client.send(
    new ListPartsCommand({
      Bucket: config.bucketName,
      Key: key,
      UploadId: uploadId,
    })
  );
  return output.Parts || [];
}

export async function completeMultipartUpload(
  config: R2Config,
  key: string,
  uploadId: string,
  parts: { PartNumber?: number; ETag?: string }[]
): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => ({
          PartNumber: part.PartNumber,
          ETag: part.ETag,
        })),
      },
    })
  );
}

export async function deleteObject(
  config: R2Config,
  key: string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
}

export async function testConnection(config: R2Config): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1,
    })
  );
}
