import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from '../config/env'
import { hasEnvR2Config } from '../config/env'
import { decryptString } from './crypto'

export type R2Config = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export type R2ConfigSource = 'env' | 'db'

async function getDbConfig(db: D1Database, masterKey: string): Promise<R2Config | null> {
  const endpoint = await db.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_endpoint')
    .first('value')
  if (!endpoint) {
    return null
  }
  const bucketName = await db.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_bucket_name')
    .first('value')
  const accessKeyEnc = await db.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_access_key_id_enc')
    .first('value')
  const secretKeyEnc = await db.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind('r2_secret_access_key_enc')
    .first('value')
  if (!bucketName || !accessKeyEnc || !secretKeyEnc) {
    return null
  }
  const accessKeyId = await decryptString(String(accessKeyEnc), masterKey)
  const secretAccessKey = await decryptString(String(secretKeyEnc), masterKey)
  return {
    endpoint: String(endpoint),
    accessKeyId,
    secretAccessKey,
    bucketName: String(bucketName)
  }
}

export async function loadR2Config(env: Env): Promise<{ config: R2Config; source: R2ConfigSource } | null> {
  if (hasEnvR2Config(env)) {
    return {
      source: 'env',
      config: {
        endpoint: env.R2_ENDPOINT as string,
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        bucketName: env.R2_BUCKET as string
      }
    }
  }
  if (!env.R2_MASTER_KEY) {
    return null
  }
  const dbConfig = await getDbConfig(env.DB, env.R2_MASTER_KEY)
  if (!dbConfig) {
    return null
  }
  return { config: dbConfig, source: 'db' }
}

export function createS3Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: true
  })
}

export async function generateUploadUrl(config: R2Config, key: string, contentType: string, expiresInSeconds: number): Promise<string> {
  const client = createS3Client(config)
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function generateDownloadUrl(config: R2Config, key: string, filename: string, expiresInSeconds: number): Promise<string> {
  const client = createS3Client(config)
  const contentDisposition = `attachment; filename=\"${filename}\"`
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ResponseContentDisposition: contentDisposition
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function initiateMultipartUpload(config: R2Config, key: string, contentType: string): Promise<string> {
  const client = createS3Client(config)
  const output = await client.send(new CreateMultipartUploadCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType
  }))
  if (!output.UploadId) {
    throw new Error('missing_upload_id')
  }
  return output.UploadId
}

export async function generateMultipartUploadUrl(config: R2Config, key: string, uploadId: string, partNumber: number, expiresInSeconds: number): Promise<string> {
  const client = createS3Client(config)
  const command = new UploadPartCommand({
    Bucket: config.bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function listParts(config: R2Config, key: string, uploadId: string) {
  const client = createS3Client(config)
  const output = await client.send(new ListPartsCommand({
    Bucket: config.bucketName,
    Key: key,
    UploadId: uploadId
  }))
  return output.Parts || []
}

export async function completeMultipartUpload(config: R2Config, key: string, uploadId: string, parts: { PartNumber?: number; ETag?: string }[]): Promise<void> {
  const client = createS3Client(config)
  await client.send(new CompleteMultipartUploadCommand({
    Bucket: config.bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(part => ({
        PartNumber: part.PartNumber,
        ETag: part.ETag
      }))
    }
  }))
}

export async function deleteObject(config: R2Config, key: string): Promise<void> {
  const client = createS3Client(config)
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key
  }))
}

export async function testConnection(config: R2Config): Promise<void> {
  const client = createS3Client(config)
  await client.send(new ListObjectsV2Command({
    Bucket: config.bucketName,
    MaxKeys: 1
  }))
}
