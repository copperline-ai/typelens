#!/usr/bin/env node
// COP-431: Generate all icon variants from the new logo source
const https = require("https");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_URL = "https://ik.imagekit.io/copperline/a7c0131d-2608-485a-aa70-5a086f47317b.png";
const PUBLIC = path.join(__dirname, "..", "public");

const PNG_VARIANTS = [
  { file: "logo.png", size: 512 },
  { file: "favicon.png", size: 32 },
  { file: "favicon-64.png", size: 64 },
  { file: path.join("icons", "icon-72.png"), size: 72 },
  { file: path.join("icons", "icon-96.png"), size: 96 },
  { file: path.join("icons", "icon-128.png"), size: 128 },
  { file: path.join("icons", "icon-144.png"), size: 144 },
  { file: path.join("icons", "icon-152.png"), size: 152 },
  { file: path.join("icons", "icon-192.png"), size: 192 },
  { file: path.join("icons", "icon-384.png"), size: 384 },
  { file: path.join("icons", "icon-512.png"), size: 512 },
];

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return resolve(download(res.headers.location));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function svgWrapper(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <image href="../logo.png" x="0" y="0" width="${size}" height="${size}"/>
</svg>
`;
}

async function main() {
  console.log("Downloading source image...");
  const srcBuf = await download(SOURCE_URL);
  console.log(`Downloaded ${srcBuf.length} bytes`);

  fs.mkdirSync(path.join(PUBLIC, "icons"), { recursive: true });

  for (const { file, size } of PNG_VARIANTS) {
    const dest = path.join(PUBLIC, file);
    await sharp(srcBuf).resize(size, size).png().toFile(dest);
    console.log(`  ${file} (${size}x${size})`);
  }

  // SVG wrappers embed the resized logo.png
  fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), svgWrapper(32));
  console.log("  favicon.svg");
  fs.writeFileSync(path.join(PUBLIC, "icon.svg"), svgWrapper(512));
  console.log("  icon.svg");

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
