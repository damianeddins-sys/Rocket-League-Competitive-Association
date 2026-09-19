import { describe, expect, it } from "vitest";
import { ALLOWED_MEDIA_TYPES, validateBinaryFile } from "./file-validation";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("binary upload validation", () => {
  it("accepts an allowed image only when its bytes and declared MIME type match", async () => {
    const allowed = new Set(ALLOWED_MEDIA_TYPES.keys());
    await expect(validateBinaryFile(onePixelPng, "image/png", allowed)).resolves.toMatchObject({
      valid: true,
      detectedType: "image/png",
    });
    await expect(validateBinaryFile(onePixelPng, "image/jpeg", allowed)).resolves.toMatchObject({
      valid: false,
      detectedType: "image/png",
    });
  });

  it("rejects unknown binary data even when the declared type is allowed", async () => {
    await expect(validateBinaryFile(
      Buffer.from("not an image"),
      "image/png",
      new Set(ALLOWED_MEDIA_TYPES.keys()),
    )).resolves.toEqual({
      valid: false,
      detectedType: null,
      extension: null,
    });
  });
});
