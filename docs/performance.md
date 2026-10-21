# Storefront performance

The October 2026 update reduces media transfers and removes per-request rendering from the public product catalog. Deploy the changes to Vercel before measuring the live improvement.

## Media

The original videos remain available for the product's full film preview. The homepage uses separate silent H.264 background versions with streaming metadata at the start of each MP4. It selects a smaller source for mobile screens, retains autoplay and fades, and pauses playback and slide rotation while the hero is offscreen or the tab is hidden. Reduced-motion behavior is preserved.

| Hero | Original | Desktop background | Mobile background |
| --- | ---: | ---: | ---: |
| Pumpkin Moon Date | 7.32 MB | 1.67 MB | 0.62 MB |
| Our Little Pink Day | 7.03 MB | 1.73 MB | 0.61 MB |
| The Midnight Key | 8.21 MB | 1.89 MB | 0.71 MB |

These are file sizes, not a measured percentage change in page loading time. Mobile background transfers are about 91% smaller overall, and desktop transfers are about 77% smaller. WebP hero posters are 154–220 KB. The existing image layer supplies the video fallback, avoiding a duplicate full PNG download through the video's `poster` attribute. Optimized assets have a one-day browser cache with background revalidation.

To regenerate these assets after changing the original artwork or videos, install FFmpeg, set `FFMPEG_PATH` if it is not on PATH, and run:

```powershell
$env:FFMPEG_PATH="C:\tools\ffmpeg\bin\ffmpeg.exe"
node node_modules/tsx/dist/cli.mjs scripts/optimize-storefront-media.mts
```

The output goes to `public/media/storefront`. Deploy these generated files along with the code. The generation script retains the source files. `tests/storefront.test.ts` checks output sizes, file existence, and streaming metadata order.

## Pages and navigation

All six product pages are prerendered using `generateStaticParams`, so Next can cache their HTML and prefetch them as static pages. A small client-side query component restores the selected link duration, review prompt, and cancelled-checkout state. Product descriptions, pricing options, images, metadata, and structured data remain present in the initial HTML. Checkout prices and publishing permissions are still validated by the server.

`app/loading.tsx` provides an immediate loading state for dynamic routes. Main navigation retains Next Link prefetching. Capsule studio code is loaded after account/connection checks, floating Vibe Generator content mounts when opened, and artwork previews mount their images on demand.

The root layout preloads Geist Sans and Playfair Display. Mono and decorative fonts remain available but are fetched when used. This reduces font preloads from six to two, from about 146 KB to 68 KB. The generated homepage HTML decreased from 91 KB to 79 KB and the catalog from 66 KB to 56 KB; these figures exclude transfer compression. Shared JavaScript is broadly unchanged, so this update does not claim a large general JavaScript reduction.

## Verification

Vercel Speed Insights is mounted once in the root layout alongside Web Analytics. After deploying, visit the live site and open the Vercel project's **Speed Insights** dashboard; enable it if prompted. Real visitor measurements help assess loading speed, responsiveness, and layout stability across routes and devices. This integration measures performance and does not itself make pages load faster. It needs no new environment variables. Its privacy filter strips URL queries and fragments, masks shared gift codes in URL and route fields, and excludes auth/API events. Debug payload logging is disabled.

Use `next build` followed by `next start` to check production behavior. The build should list `/products/[slug]` as static generated pages. Requests for known products should return `x-nextjs-cache: HIT`, and optimized MP4s should accept byte-range requests with `206` responses. Google-return and product-option tests cover the preserved purchase destination and duration.

After deployment, measure the live homepage and a product page on mobile, including a cold load and subsequent navigation. Development compilation times and local HTTP timing are not representative of live Core Web Vitals. This update has no database migrations or payment-mode changes.
