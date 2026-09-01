"use client";

import { useState } from "react";
import { BarChart3, Map } from "lucide-react";
import { AnalyticsClient } from "./analytics-client";
import { VisitorMapClient } from "./visitor-map-client";

export function StatsTabs() {
  const [activeTab, setActiveTab] = useState<"analytics" | "map">("analytics");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Tab 切换 */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "analytics"
              ? "bg-amber text-white shadow-sm"
              : "text-[rgb(var(--muted-foreground))] hover:text-amber-bright"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          访客分析
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "map"
              ? "bg-amber text-white shadow-sm"
              : "text-[rgb(var(--muted-foreground))] hover:text-amber-bright"
          }`}
        >
          <Map className="h-4 w-4" />
          访客地图
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === "analytics" ? <AnalyticsClient hideHeader /> : <VisitorMapClient hideHeader />}
    </div>
  );
}
