import { fileTypeFromBuffer } from "file-type";

export const ALLOWED_MEDIA_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export async function validateBinaryFile(
  bytes: Uint8Array,
  declaredType: string,
  allowedTypes: ReadonlySet<string>,
) {
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || detected.mime !== declaredType || !allowedTypes.has(detected.mime)) {
    return {
      valid: false as const,
      detectedType: detected?.mime ?? null,
      extension: null,
    };
  }
  return {
    valid: true as const,
    detectedType: detected.mime,
    extension: detected.ext,
  };
}
