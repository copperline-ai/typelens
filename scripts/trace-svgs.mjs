/**
 * Produces SVG files from the canonical PNG brand assets.
 *
 * potrace generates monochrome threshold traces — unsuitable for coloured logos.
 * Instead we wrap each PNG as a base64-encoded <image> element inside a valid SVG
 * so consumers can reference .svg paths with perfect brand fidelity.
 *
 * The wordmark is rendered as styled text in the sidebar (not as an image),
 * so no wordmark SVG is produced here.
 *
 * Outputs:
 *   public/favicon.svg  ← wraps public/favicon.png        (32×32)
 *   public/icon.svg     ← wraps public/icons/icon-192.png (192×192)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

function makeSvg(pngPath, width, height, label) {
  const data = readFileSync(pngPath);
  const b64 = data.toString("base64");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `     viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"`,
    `     role="img" aria-label="${label}">`,
    `  <image href="data:image/png;base64,${b64}" width="${width}" height="${height}"/>`,
    `</svg>`,
  ].join("\n");
}

const assets = [
  {
    src: join(PUBLIC, "favicon.png"),
    dst: join(PUBLIC, "favicon.svg"),
    width: 32,
    height: 32,
    label: "TypeLens favicon",
  },
  {
    src: join(PUBLIC, "icons", "icon-192.png"),
    dst: join(PUBLIC, "icon.svg"),
    width: 192,
    height: 192,
    label: "TypeLens icon",
  },
];

for (const { src, dst, width, height, label } of assets) {
  const svg = makeSvg(src, width, height, label);
  writeFileSync(dst, svg, "utf8");
  const kb = (svg.length / 1024).toFixed(1);
  console.log(`  → ${dst.replace(ROOT + "/", "")} (${kb} KB)`);
}

console.log("\nDone.");
