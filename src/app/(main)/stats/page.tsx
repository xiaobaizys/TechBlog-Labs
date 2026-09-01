import { AnalyticsClient } from "./analytics-client";
import { VisitorMapClient } from "./visitor-map-client";
import { StatsTabs } from "./stats-tabs";

export const metadata = {
  title: "访客统计",
};

export default function StatsPage() {
  return <StatsTabs />;
}
