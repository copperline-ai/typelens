/**
 * Processes logo and wordmark PNGs:
 * - Removes white backgrounds (flood-fill from corners, tolerance-based)
 * - Generates PWA icon variants (72–512px)
 * - Generates favicon PNG
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const ICONS_DIR = join(PUBLIC, "icons");

mkdirSync(ICONS_DIR, { recursive: true });

async function removeWhiteBackground(inputPath, tolerance = 35) {
  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const output = Buffer.from(data);

  // Sample background color from top-left corner
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  function isBackground(pixelIdx) {
    const base = pixelIdx * channels;
    const r = data[base];
    const g = data[base + 1];
    const b = data[base + 2];
    return (
      Math.abs(r - bgR) <= tolerance &&
      Math.abs(g - bgG) <= tolerance &&
      Math.abs(b - bgB) <= tolerance
    );
  }

  const visited = new Uint8Array(pixelCount);
  const queue = [];

  const corners = [0, width - 1, (height - 1) * width, (height - 1) * width + (width - 1)];

  for (const corner of corners) {
    if (!visited[corner] && isBackground(corner)) {
      queue.push(corner);
      visited[corner] = 1;
    }
  }

  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % width;
    const y = Math.floor(idx / width);

    output[idx * channels + 3] = 0;

    if (x > 0 && !visited[idx - 1] && isBackground(idx - 1)) {
      visited[idx - 1] = 1;
      queue.push(idx - 1);
    }
    if (x < width - 1 && !visited[idx + 1] && isBackground(idx + 1)) {
      visited[idx + 1] = 1;
      queue.push(idx + 1);
    }
    if (y > 0 && !visited[idx - width] && isBackground(idx - width)) {
      visited[idx - width] = 1;
      queue.push(idx - width);
    }
    if (y < height - 1 && !visited[idx + width] && isBackground(idx + width)) {
      visited[idx + width] = 1;
      queue.push(idx + width);
    }
  }

  return sharp(output, { raw: { width, height, channels } }).png();
}

async function main() {
  console.log("Processing logo.png...");
  const logoBase = await removeWhiteBackground("/tmp/logo.png");

  // Save full-size transparent logo
  await logoBase.clone().toFile(join(PUBLIC, "logo.png"));
  console.log("  → public/logo.png");

  // PWA icon sizes
  const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    await (
      await removeWhiteBackground("/tmp/logo.png")
    )
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(join(ICONS_DIR, `icon-${size}.png`));
    console.log(`  → public/icons/icon-${size}.png`);
  }

  // Favicon: 32x32
  await (
    await removeWhiteBackground("/tmp/logo.png")
  )
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(join(PUBLIC, "favicon.png"));
  console.log("  → public/favicon.png");

  // Also 64x64 for retina favicon
  await (
    await removeWhiteBackground("/tmp/logo.png")
  )
    .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(join(PUBLIC, "favicon-64.png"));
  console.log("  → public/favicon-64.png");

  console.log("\nProcessing word-mark.png...");
  const wordmarkBase = await removeWhiteBackground("/tmp/word-mark.png");
  await wordmarkBase.toFile(join(PUBLIC, "wordmark.png"));
  console.log("  → public/wordmark.png");

  // OG-image-friendly wordmark at 1200x630 with padding
  await (
    await removeWhiteBackground("/tmp/word-mark.png")
  )
    .resize(600, null, { fit: "inside" })
    .toFile(join(PUBLIC, "wordmark-sm.png"));
  console.log("  → public/wordmark-sm.png");

  console.log("\nAll images processed successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
