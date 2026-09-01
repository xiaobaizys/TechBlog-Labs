"use client";

import { VisitorMap } from "@/components/analytics/VisitorMap";

interface VisitorMapClientProps {
  hideHeader?: boolean;
}

export function VisitorMapClient({ hideHeader = false }: VisitorMapClientProps) {
  return <VisitorMap hideHeader={hideHeader} />;
}
