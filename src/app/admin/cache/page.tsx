import { CacheClient } from "./cache-client";

export const metadata = {
  title: "缓存监控 - 管理后台",
};

export default function CachePage() {
  return <CacheClient />;
}
