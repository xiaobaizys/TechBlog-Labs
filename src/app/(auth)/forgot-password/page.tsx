"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * 忘记密码页面
 *
 * 提交邮箱后调用 /api/auth/forgot-password（占位接口），
 * 后端会发送包含重置链接的邮件。
 */
export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailError =
    !email.trim()
      ? "请输入邮箱"
      : !EMAIL_RE.test(email.trim())
      ? "邮箱格式不正确"
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");
    setSuccess("");

    if (emailError) {
      setError(emailError);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        // 即便邮箱不存在，也给出统一成功提示，避免账号枚举
        if (res.ok) {
          setSuccess(
            "如果该邮箱已注册，你将在几分钟内收到一封密码重置邮件。请检查收件箱与垃圾邮件文件夹。"
          );
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.message || "请求失败，请稍后重试");
        }
      } catch {
        setError("网络错误，请检查网络连接后重试");
      }
    });
  }

  const showEmailError = touched && !!emailError;

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-bright/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="theme-card p-8 md:p-10">
          {/* 标题 */}
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center justify-center gap-3">
              <span className="inline-block w-8 h-px bg-amber-bright/60" />
              — Reset
              <span className="inline-block w-8 h-px bg-amber-bright/60" />
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              忘记密码
            </h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
              输入注册邮箱，我们会发送重置链接
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-6 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* 成功提示 */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              className="mb-6 rounded-lg border border-green-300/60 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                邮箱
              </label>
              <div
                className={`relative flex items-center rounded-lg border bg-[rgb(var(--card))] transition-all ${
                  showEmailError
                    ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                    : "border-[rgb(var(--border))] focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20"
                }`}
              >
                <span className="pl-3 text-[rgb(var(--muted-foreground))]">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                />
              </div>
              {showEmailError && (
                <p className="mt-1.5 text-xs text-red-500">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-shimmer mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  发送中...
                </span>
              ) : (
                "发送重置链接"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
            想起来了？{" "}
            <Link
              href="/login"
              className="font-medium text-amber-bright hover:text-amber underline underline-offset-2"
            >
              返回登录
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
