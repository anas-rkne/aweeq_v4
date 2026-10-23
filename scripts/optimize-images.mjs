/**
 * Image pipeline.
 *
 * The hero frames arrived as raw PNG/JPEG masters (up to 2.9 MB each). This
 * script re-encodes every frame to WebP at a sane display width, so the
 * repository carries a small file and Next's optimizer has a cheap source to
 * work from.
 *
 *   node scripts/optimize-images.mjs
 *
 * Sources are never overwritten: the re-encoded file is written next to the
 * master as `<id>.webp`. Delete the master by hand once the new file is in
 * place, or let the script move it to the backup folder below.
 */
import sharp from "sharp";
import { mkdir, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const HERO_DIR = path.join(ROOT, "public", "images", "hero");
const BACKUP_DIR = path.join(ROOT, ".asset-backup", "hero");

/** id → master file, and the width the frame is drawn at. */
const FRAMES = [
  { id: "babylon", master: "hero_img.png" },
  { id: "egypt", master: "egypt.jpg" },
  { id: "china", master: "china.jpg" },
  { id: "greece", master: "grees.jpg" },
];

const MAX_WIDTH = 1920;
const QUALITY = 80;

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

await mkdir(BACKUP_DIR, { recursive: true });

for (const { id, master } of FRAMES) {
  const from = path.join(HERO_DIR, master);
  const to = path.join(HERO_DIR, `${id}.webp`);

  if (!existsSync(from)) {
    console.log(`skip ${id}: ${master} is gone`);
    continue;
  }

  const image = sharp(from, { failOn: "none" });
  const meta = await image.metadata();
  const width = Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH);

  const buffer = await image
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toBuffer();

  await sharp(buffer).toFile(to);

  const before = (await stat(from)).size;
  const after = (await stat(to)).size;

  const backup = path.join(BACKUP_DIR, master);
  await rename(from, backup);

  console.log(
    `${id.padEnd(8)} ${kb(before).padStart(8)} → ${kb(after).padStart(8)}  ` +
      `${meta.width}x${meta.height} → ${width}x${Math.round((meta.height / meta.width) * width)}  ` +
      `master moved to .asset-backup/hero/${master}`,
  );
}
