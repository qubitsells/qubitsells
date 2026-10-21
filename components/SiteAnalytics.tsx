"use client";

import { Analytics } from "@vercel/analytics/next";
import { prepareAnalyticsEvent } from "@/lib/analytics";

export default function SiteAnalytics() {
  return <Analytics beforeSend={prepareAnalyticsEvent} />;
}
