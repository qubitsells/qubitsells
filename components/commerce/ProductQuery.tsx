"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { productOptions } from "@/lib/product-navigation";

// Only this small leaf needs request-specific query parameters. Keeping it in
// Suspense lets the product description, gallery and prices be prerendered.
export default function ProductQuery({ onChange }: { onChange: (options: ReturnType<typeof productOptions>) => void }) {
  const params = useSearchParams();
  useEffect(() => { onChange(productOptions(params)); }, [params, onChange]);
  return null;
}
