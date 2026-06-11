"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * 退出登录按钮（个人中心用）
 *
 *  - 调用 next-auth 的 signOut({ callbackUrl: "/" })
 *  - 期间显示"退出中..."状态
 *  - 完成后由 next-auth 跳到首页
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localLoading, setLocalLoading] = useState(false);
  const busy = isPending || localLoading;

  function handleClick() {
    if (busy) return;
    setLocalLoading(true);
    startTransition(async () => {
      try {
        // callbackUrl 让 next-auth 退出后跳到首页
        await signOut({ callbackUrl: "/" });
      } catch {
        // 兜底：万一 signOut 抛错，至少把用户带回首页
        setLocalLoading(false);
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium transition-all hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-red-400"
    >
      {busy ? "退出中..." : "退出登录"}
    </button>
  );
}
