"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/lib/toast";
import { ConsoleSilencer } from "@/components/dev/console-silencer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    /* SessionProvider 配置：
     *   - refetchInterval: 5 分钟
     *     默认 0（每次 focus 都拉）→ 改成 5 分钟静默拉一次
     *   - refetchOnWindowFocus: false
     *     切回 tab 时不再立刻拉，靠 5 分钟的静默轮询足够保证新鲜度
     *   这两个调整能显著降低 /api/auth/session 的调用次数
     */
    <SessionProvider refetchInterval={300} refetchOnWindowFocus={false}>
      {/* dev-only: 吞掉 RSC prefetch / next-auth 轮询产生的已知噪音 */}
      <ConsoleSilencer />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        storageKey="vitalog-theme"
        disableTransitionOnChange={false}
      >
        {/* 全局 Toast 挂载点
         *   - 位置 top-center（admin / form 提示最自然的位置）
         *   - richColors：success 绿、error 红、info 蓝、warning 黄
         *   - theme="system"：跟随 next-themes 的明暗切换
         *   - expand=true：超过 4 个 toast 自动展开查看
         */}
        <Toaster
          position="top-center"
          theme="system"
          richColors
          closeButton
          expand
          duration={3000}
          toastOptions={{
            classNames: {
              toast:
                "!rounded-xl !border !border-[rgb(var(--border))] !bg-[rgb(var(--card))] !text-[rgb(var(--foreground))] !shadow-lg",
              title: "!text-sm !font-medium",
            },
          }}
        />
        {/* 顶部 Header 已移除；导航由各路由组的 layout 决定 */}
        <main className="flex-1">{children}</main>
      </ThemeProvider>
    </SessionProvider>
  );
}
