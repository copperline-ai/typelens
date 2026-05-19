#!/usr/bin/env node
// Regenerate all icon variants from the SVG logo mark source.
// Requires: sharp, @resvg/resvg-js, or run via a browser-based capture.
// Quickest path on macOS: npm run generate-icons (uses sips + magick).
const { execSync } = require("child_process");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const MASTER = path.join(PUBLIC, "logo.png"); // 512x512 square, no rounded corners

const PNG_VARIANTS = [
  { file: "favicon.png", size: 32 },
  { file: "favicon-64.png", size: 64 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: path.join("icons", "icon-72.png"), size: 72 },
  { file: path.join("icons", "icon-96.png"), size: 96 },
  { file: path.join("icons", "icon-128.png"), size: 128 },
  { file: path.join("icons", "icon-144.png"), size: 144 },
  { file: path.join("icons", "icon-152.png"), size: 152 },
  { file: path.join("icons", "icon-192.png"), size: 192 },
  { file: path.join("icons", "icon-384.png"), size: 384 },
  { file: path.join("icons", "icon-512.png"), size: 512 },
];

function sips(size, dest) {
  execSync(`sips -z ${size} ${size} "${MASTER}" --out "${dest}"`, { stdio: "pipe" });
}

function main() {
  console.log(`Source: ${MASTER}`);

  for (const { file, size } of PNG_VARIANTS) {
    const dest = path.join(PUBLIC, file);
    sips(size, dest);
    console.log(`  ${file} (${size}x${size})`);
  }

  // Multi-size favicon.ico
  const ico = path.join(PUBLIC, "favicon.ico");
  execSync(`magick "${MASTER}" -define icon:auto-resize=16,24,32,48,64 "${ico}"`, {
    stdio: "pipe",
  });
  console.log("  favicon.ico");

  // Transparent-corners PNG for web/logo use
  const transparent = path.join(PUBLIC, "logo-mark-transparent.png");
  execSync(
    `magick "${MASTER}" \\( +clone -alpha extract -draw "roundrectangle 0,0,511,511,89,89" \\) -alpha off -compose CopyOpacity -composite "${transparent}"`,
    { stdio: "pipe" },
  );
  console.log("  logo-mark-transparent.png");

  console.log(
    "Done. Note: if you update the logo, re-capture logo.png from logo-capture.html at 512x512 first.",
  );
}

main();
