"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { prepareSpeedInsightsEvent } from "@/lib/analytics";

export default function SiteSpeedInsights() {
  return <SpeedInsights beforeSend={prepareSpeedInsightsEvent} debug={false} />;
}
