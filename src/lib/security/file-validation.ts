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
