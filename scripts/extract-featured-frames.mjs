#!/usr/bin/env node
/**
 * Frame extraction for the FeaturedFragrance scroll sequence.
 *
 * Reads the film, keeps its own aspect ratio (the master is portrait, 864x896),
 * scales it to 960px wide, drops it to 15 fps (a scroll scrub never needs more)
 * and writes numbered JPEGs the canvas can draw.
 *
 *   node scripts/extract-featured-frames.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const candidates = [
  join(root, "public", "images", "featured_section.mp4"),
  join(root, "public", "featured_section.mp4"),
];
const video = candidates.find((p) => existsSync(p));
const outDir = join(root, "public", "featured_frames");

if (!video) {
  console.error("Missing video. Expected one of:\n  " + candidates.join("\n  "));
  process.exit(1);
}

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

const args = [
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  video,
  "-vf",
  "scale=960:-2",
  "-r",
  "15",
  "-q:v",
  "3",
  join(outDir, "frame-%03d.jpg"),
];

try {
  execFileSync("ffmpeg", args, { stdio: "inherit" });
} catch {
  console.error("ffmpeg failed. Install ffmpeg and make sure it is on PATH.");
  process.exit(1);
}

console.log("Frames written to", outDir);
