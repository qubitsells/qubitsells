import { publicSiteSummary } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return new Response(publicSiteSummary(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
