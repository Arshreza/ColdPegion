/**
 * Magic-byte (file signature) validation. Extension checks alone are
 * spoofable — a "report.pdf" could be an executable. Each allowed extension
 * maps to the content signatures it may legitimately carry.
 */
const ZIP = [[0x50, 0x4b, 0x03, 0x04]]; // xlsx/pptx/docx are OOXML zip containers
const OLE2 = [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]]; // legacy Office
const SIGNATURES: Record<string, number[][]> = {
  ".pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  ".png": [[0x89, 0x50, 0x4e, 0x47]],
  ".jpg": [[0xff, 0xd8, 0xff]],
  ".jpeg": [[0xff, 0xd8, 0xff]],
  ".gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  ".webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WEBP tag checked below)
  ".xlsx": ZIP,
  ".pptx": ZIP,
  ".docx": ZIP,
  ".xls": OLE2,
  ".ppt": OLE2,
  ".doc": OLE2,
};

function startsWith(buffer: Buffer, sig: number[]): boolean {
  if (buffer.length < sig.length) return false;
  return sig.every((byte, i) => buffer[i] === byte);
}

/**
 * Verify a file's content matches its claimed extension. CSV has no magic
 * bytes, so it's checked for being plausible text (no NUL bytes) instead.
 */
export function matchesMagicBytes(buffer: Buffer, ext: string): boolean {
  const extension = ext.toLowerCase();

  if (extension === ".csv") {
    const sample = buffer.subarray(0, 8192);
    return !sample.includes(0);
  }

  const signatures = SIGNATURES[extension];
  if (!signatures) return false;
  if (!signatures.some((sig) => startsWith(buffer, sig))) return false;

  // RIFF containers must also declare WEBP (bytes 8–11), not WAV/AVI.
  if (extension === ".webp") {
    return buffer.length >= 12 && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return true;
}

/**
 * Security helper to validate the schema and shape of product files.
 * Ensures that all referenced file URLs are scoped exactly to the user's
 * upload folder and do not contain path traversal segments (e.g. "..").
 */
export function validateProductFiles(filesJson: string | undefined, userId: string): boolean {
  if (!filesJson) return true;
  try {
    const files = JSON.parse(filesJson);
    if (!Array.isArray(files)) return false;

    for (const file of files) {
      if (typeof file !== "object" || file === null) return false;
      if (typeof file.url !== "string" || typeof file.filename !== "string") return false;

      // Ensure the URL prefixes with the user's specific uploads folder
      const expectedPrefix = `/uploads/products/${userId}/`;
      if (!file.url.startsWith(expectedPrefix)) {
        return false;
      }

      // Ensure the URL does not contain path traversal directories (".." or ".")
      const urlSegments = file.url.split("/");
      if (urlSegments.includes("..") || urlSegments.includes(".")) {
        return false;
      }

      // Ensure the filename does not contain path traversal or directory components
      if (file.filename.includes("/") || file.filename.includes("\\") || file.filename.includes("..")) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
