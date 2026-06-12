import { extname } from "path";
import { readUpload } from "@/lib/storage";

/**
 * Serves uploads that aren't on local disk (i.e. when the S3-compatible
 * storage driver is active). With the local driver, files physically live in
 * public/uploads/ and Next's static file serving answers first — this route
 * only runs for misses, keeping the "/uploads/<key>" URLs stored in the DB
 * valid under both drivers.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
};

export async function GET(_request: Request, props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  if (!path?.length || path.some((seg) => seg === "" || seg === "." || seg === "..")) {
    return new Response("Not found", { status: 404 });
  }

  const key = path.join("/");
  const data = await readUpload(key);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[extname(key).toLowerCase()] || "application/octet-stream",
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
