import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname, resolve, sep } from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Upload storage with two drivers:
 *
 *  - S3-compatible (AWS S3, Cloudflare R2, MinIO, …) when STORAGE_S3_BUCKET is
 *    set. Required for any serverless/multi-instance deploy — local disk is
 *    ephemeral there and not shared with the worker process.
 *  - Local disk under public/uploads/ otherwise (dev / single-server).
 *
 * Keys are relative paths like "products/<userId>/<uuid>.pdf" and map to the
 * public URL "/uploads/<key>" in both drivers (the /uploads/[...path] route
 * serves them when they're not on local disk).
 *
 * Env vars for the S3 driver:
 *   STORAGE_S3_BUCKET            (enables the driver)
 *   STORAGE_S3_REGION            (default "auto" — fine for R2)
 *   STORAGE_S3_ENDPOINT          (e.g. https://<account>.r2.cloudflarestorage.com)
 *   STORAGE_S3_ACCESS_KEY_ID / STORAGE_S3_SECRET_ACCESS_KEY
 */

const LOCAL_ROOT = join(process.cwd(), "public", "uploads");

let s3: S3Client | null = null;

function bucket(): string | undefined {
  return process.env.STORAGE_S3_BUCKET;
}

export function isRemoteStorage(): boolean {
  return Boolean(bucket());
}

function s3Client(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.STORAGE_S3_REGION || "auto",
      ...(process.env.STORAGE_S3_ENDPOINT ? { endpoint: process.env.STORAGE_S3_ENDPOINT } : {}),
      ...(process.env.STORAGE_S3_ACCESS_KEY_ID && process.env.STORAGE_S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }
  return s3;
}

/** Resolve a key inside the local root, rejecting traversal out of it. */
function localPath(key: string): string {
  const path = resolve(LOCAL_ROOT, key);
  if (path !== LOCAL_ROOT && !path.startsWith(LOCAL_ROOT + sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return path;
}

export async function saveUpload(key: string, data: Buffer, contentType?: string): Promise<void> {
  if (isRemoteStorage()) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: data,
        ...(contentType ? { ContentType: contentType } : {}),
      })
    );
    return;
  }
  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

/** Read an upload's content. Returns null when the object doesn't exist. */
export async function readUpload(key: string): Promise<Buffer | null> {
  if (isRemoteStorage()) {
    try {
      const res = await s3Client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch {
      return null;
    }
  }
  try {
    const path = localPath(key);
    if (!existsSync(path)) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

/** Map a stored "/uploads/..." URL (as kept in the DB) back to a storage key. */
export function uploadUrlToKey(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const key = url.slice("/uploads/".length);
  if (!key || key.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  return key;
}
