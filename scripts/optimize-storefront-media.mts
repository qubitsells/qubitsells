// Run with FFMPEG_PATH pointing to ffmpeg, or put ffmpeg on PATH:
// node node_modules/tsx/dist/cli.mjs scripts/optimize-storefront-media.mts
import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { HERO_PRODUCTS } from "../lib/storefront";

const run = promisify(execFile);
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const publicFile = (path: string) => join(process.cwd(), "public", path);
await mkdir(publicFile("media/storefront"), { recursive: true });

for (const product of HERO_PRODUCTS) {
  if (!product.video || !product.heroVideo || !product.heroVideoMobile || !product.heroPoster) continue;
  await sharp(publicFile(product.image)).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 80 }).toFile(publicFile(product.heroPoster));
  await Promise.all([
    { output: product.heroVideo, width: 1280, quality: "25", rate: "1800k", buffer: "3600k" },
    { output: product.heroVideoMobile, width: 768, quality: "27", rate: "800k", buffer: "1600k" },
  ].map(async variant => {
    await run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", publicFile(product.video!),
      "-an", "-vf", `scale=${variant.width}:-2,fps=24`, "-c:v", "libx264", "-preset", "medium",
      "-crf", variant.quality, "-maxrate", variant.rate, "-bufsize", variant.buffer,
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2", publicFile(variant.output)], { maxBuffer: 1024 * 1024 });
  }));
  console.log(JSON.stringify({ product: product.slug, originalBytes: (await stat(publicFile(product.video))).size,
    desktopBytes: (await stat(publicFile(product.heroVideo))).size, mobileBytes: (await stat(publicFile(product.heroVideoMobile))).size,
    posterBytes: (await stat(publicFile(product.heroPoster))).size }));
}
