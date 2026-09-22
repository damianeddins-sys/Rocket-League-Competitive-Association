import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_RLCA_LOGO_HEIGHT,
  OFFICIAL_RLCA_LOGO_PATH,
  OFFICIAL_RLCA_LOGO_WIDTH,
} from "./brand-assets";

const assetPath = join(process.cwd(), "public", OFFICIAL_RLCA_LOGO_PATH);

function pngTransparency(path: string) {
  const png = readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const compressed: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      expect(data[12]).toBe(0);
    }
    if (type === "IDAT") compressed.push(data);
    if (type === "IEND") break;
  }
  expect(colorType).toBe(6);

  const raw = inflateSync(Buffer.concat(compressed));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  let rawOffset = 0;
  let transparentPixels = 0;
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  const paeth = (left: number, above: number, upperLeft: number) => {
    const estimate = left + above - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const aboveDistance = Math.abs(estimate - above);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
      ? left
      : aboveDistance <= upperLeftDistance ? above : upperLeft;
  };

  for (let row = 0; row < height; row += 1) {
    const filter = raw[rawOffset++];
    for (let column = 0; column < stride; column += 1) {
      const encoded = raw[rawOffset++];
      const left = column >= bytesPerPixel ? current[column - bytesPerPixel] : 0;
      const above = previous[column];
      const upperLeft = column >= bytesPerPixel ? previous[column - bytesPerPixel] : 0;
      const predictor = filter === 1
        ? left
        : filter === 2
          ? above
          : filter === 3
            ? Math.floor((left + above) / 2)
            : filter === 4
              ? paeth(left, above, upperLeft)
              : 0;
      current[column] = (encoded + predictor) & 255;
    }
    for (let alpha = 3; alpha < stride; alpha += bytesPerPixel) {
      if (current[alpha] === 0) transparentPixels += 1;
    }
    current.copy(previous);
  }
  return { width, height, transparentPixels };
}

describe("official RLCA logo authority", () => {
  it("uses one canonical transparent master asset", () => {
    const logo = pngTransparency(assetPath);
    expect(logo).toMatchObject({
      width: OFFICIAL_RLCA_LOGO_WIDTH,
      height: OFFICIAL_RLCA_LOGO_HEIGHT,
    });
    expect(logo.transparentPixels).toBeGreaterThan(logo.width * logo.height * 0.5);
    expect(readdirSync(join(process.cwd(), "public", "branding"))
      .filter((name) => /rlca.*logo|logo.*rlca/i.test(name))).toEqual([
      "rlca-logo-transparent.png",
    ]);
  });
});
