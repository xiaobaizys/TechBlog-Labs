"use client";

import { VisitorMap } from "@/components/analytics/VisitorMap";

export function MapClient() {
  return (
    <VisitorMap
      showExport
      showBackLink
      backHref="/admin"
      backLabel="返回统计"
    />
  );
}
