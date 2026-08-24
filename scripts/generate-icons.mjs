// Rasterizeert scripts/icon-source.svg naar alle PWA-icoongroottes.
// Draaien: node scripts/generate-icons.mjs

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceSvg = join(__dirname, "icon-source.svg");

const targets = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/icon-maskable-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
  { file: "src/app/icon.png", size: 512 },
];

await mkdir(join(root, "public/icons"), { recursive: true });

for (const target of targets) {
  const outPath = join(root, target.file);
  await sharp(sourceSvg).resize(target.size, target.size).png().toFile(outPath);
  console.log(`✓ ${target.file} (${target.size}x${target.size})`);
}
