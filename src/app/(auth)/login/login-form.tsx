"use client";

import { useState, useMemo, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "@/lib/toast";
import {
  loadRememberedAccount,
  saveRememberedAccount,
  clearRememberedAccount,
} from "@/lib/remember-account";

type LoginMode = "email" | "username";

/**
 * 简单邮箱校验
 */
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError = searchParams.get("error");

  // ============================================================
  // 状态
  // ============================================================
  const [submitting, setSubmitting] = useState(false);  // 登录按钮 loading
  const [mode, setMode] = useState<LoginMode>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  // 字段级 touched（用于失焦后才显示错误）
  const [touched, setTouched] = useState<{ id?: boolean; pwd?: boolean }>({});
  // 标记是否自动填充（用于 UI 提示「已记住」）
  const [autoFilled, setAutoFilled] = useState(false);

  /* ============================================================
   *  URL ?error= 处理
   *  当使用 redirect: true 时，登录失败会让 next-auth 跳回 /login?error=xxx
   *  我们从 searchParams 读出错误并展示
   * ============================================================ */
  useEffect(() => {
    if (!urlError) return;
    let msg: string;
    switch (urlError) {
      case "CredentialsSignin":
        msg = "邮箱或密码错误";
        break;
      case "Configuration":
        msg = "服务端认证配置异常，请联系管理员";
        break;
      case "AccessDenied":
        msg = "没有访问权限";
        break;
      default:
        msg = `登录失败：${urlError}`;
    }
    setError(msg);
    toast.error(msg);
    // 清理 URL 上的 error 参数，避免刷新页面时再次显示
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }, [urlError]);

  /* ============================================================
   *  页面加载：尝试从 localStorage 还原上次记住的账号
   *  - 自动填表 + 自动勾选「记住我」
   *  - 同时切到对应的登录模式（email / username）
   *  - 触发 onBlur，避免首次失焦才出现错误
   * ============================================================ */
  useEffect(() => {
    const saved = loadRememberedAccount();
    if (saved) {
      setMode(saved.mode);
      setIdentifier(saved.identifier);
      setPassword(saved.password);
      setRemember(true);
      setAutoFilled(true);
      setTouched({ id: true, pwd: true });
    }
  }, []);

  /* ============================================================
   *  实时校验
   * ============================================================ */
  const validation = useMemo(() => {
    const errors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.identifier = mode === "email" ? "请输入邮箱" : "请输入用户名";
    } else if (mode === "email" && !EMAIL_RE.test(identifier.trim())) {
      errors.identifier = "邮箱格式不正确";
    } else if (mode === "username" && identifier.trim().length < 2) {
      errors.identifier = "用户名至少 2 个字符";
    }

    if (!password) {
      errors.password = "请输入密码";
    } else if (password.length < 6) {
      errors.password = "密码至少 6 个字符";
    }

    return errors;
  }, [identifier, password, mode]);

  const showIdError = touched.id && !!validation.identifier;
  const showPwdError = touched.pwd && !!validation.password;
  const isFormValid = !validation.identifier && !validation.password;

  // ============================================================
  // 提交登录
  // ============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 提交前强制全量 touched
    setTouched({ id: true, pwd: true });
    if (!isFormValid) {
      setError(validation.identifier || validation.password || "请检查表单内容");
      return;
    }

    setSubmitting(true);

    // ⚠️ 必须先处理「记住我」！
    // 因为下面 signIn 用 redirect: true，浏览器会立刻跳走，组件也会卸载，
    // 再写 localStorage 也来不及了
    if (remember) {
      saveRememberedAccount(identifier.trim(), password, mode);
    } else {
      clearRememberedAccount();
    }

    try {
      // 先弹一个轻提示，提升体感（redirect 后 toast 会被 Sonner 自动 hold 住）
      toast.success("登录成功 · 跳转中…");

      // 当前后端 credentials 仅支持 email 字段；若按用户名登录，
      // 也作为 email 传入，由后端决定是否扩展支持。
      //
      // 关键：用 redirect: true 让 next-auth 服务端原生重定向到 callbackUrl
      //   - 跳过客户端 router.push 的所有 race condition
      //   - 配合 callbackUrl 显式传入，不会跳回 /login
      //   - 失败时 next-auth 会重定向到 /login?error=xxx，由上面的 useEffect 显示
      //
      // 副作用：signIn 走整页跳转，浏览器 URL 直接变化
      //   不会再有「点了登录但 URL 不变」的情况
      const result = await signIn("credentials", {
        email: identifier.trim(),
        password,
        callbackUrl,
        redirect: false, // 自己处理跳转，避免 v5 在 redirect:true 时偶发不跳
      });

      if (!result) {
        setError("登录服务无响应，请稍后重试");
        setSubmitting(false);
        return;
      }

      if (result.error) {
        // 服务端抛了错（凭据错误等），把错误映射成中文
        setError("邮箱或密码错误");
        toast.error("邮箱或密码错误");
        setSubmitting(false);
        return;
      }

      // 成功：用 router.push 跳到 callbackUrl
      // 这样可以同时触发 SessionProvider 刷新，导航栏能立刻反映登录态
      const target = result.url || callbackUrl || "/";
      window.location.href = target; // 整页跳最稳，避免 SPA 状态不一致
    } catch (err) {
      console.error("[login] submit error:", err);
      setSubmitting(false);
      setError("网络错误，请检查网络连接后重试");
      toast.error("网络错误，请检查网络连接后重试");
    }
  }

  // ============================================================
  // GitHub 登录
  // ============================================================
  async function handleGitHubLogin() {
    setIsGitHubLoading(true);
    setError("");

    try {
      // GitHub OAuth：必须传 callbackUrl，否则会被 next-auth 重定向回 /login
      await signIn("github", { callbackUrl, redirect: true });
    } catch {
      setError("GitHub 登录失败");
      setIsGitHubLoading(false);
    }
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div className="relative flex items-center justify-center px-4 py-6">
      {/* 背景装饰：与 Stargazer 主题呼应 */}
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
          {/* 标题区 */}
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center justify-center gap-3">
              <span className="inline-block w-8 h-px bg-amber-bright/60" />
              — Sign in
              <span className="inline-block w-8 h-px bg-amber-bright/60" />
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              欢迎回来
            </h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
              登录你的 VitaLog 账号
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

          {/* 登录模式切换：邮箱 / 用户名 */}
          <div className="mb-6 inline-flex w-full rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-1">
            {(["email", "username"] as LoginMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                  setTouched({});
                }}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-amber text-night shadow-amber"
                    : "text-[rgb(var(--muted-foreground))] hover:text-foreground"
                }`}
              >
                {m === "email" ? "邮箱登录" : "用户名登录"}
              </button>
            ))}
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 邮箱 / 用户名 */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-sm font-medium"
              >
                {mode === "email" ? "邮箱" : "用户名"}
              </label>
              <div
                className={`relative flex items-center rounded-lg border bg-[rgb(var(--card))] transition-all ${
                  showIdError
                    ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                    : "border-[rgb(var(--border))] focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20"
                }`}
              >
                <span className="pl-3 text-[rgb(var(--muted-foreground))]">
                  {/* 图标 */}
                  {mode === "email" ? (
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
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </span>
                <input
                  id="identifier"
                  type={mode === "email" ? "email" : "text"}
                  autoComplete={mode === "email" ? "email" : "username"}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, id: true }))}
                  placeholder={
                    mode === "email" ? "your@email.com" : "your username"
                  }
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                />
              </div>
              {showIdError && (
                <p className="mt-1.5 text-xs text-red-500">
                  {validation.identifier}
                </p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium">
                  密码
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-amber-bright hover:text-amber underline underline-offset-2"
                >
                  忘记密码？
                </Link>
              </div>
              <div
                className={`relative flex items-center rounded-lg border bg-[rgb(var(--card))] transition-all ${
                  showPwdError
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
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, pwd: true }))}
                  placeholder="输入密码"
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="pr-3 text-[rgb(var(--muted-foreground))] hover:text-amber transition-colors"
                >
                  {showPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {showPwdError && (
                <p className="mt-1.5 text-xs text-red-500">
                  {validation.password}
                </p>
              )}
            </div>

            {/* 记住我 */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-[rgb(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRemember(checked);
                      // 用户主动取消勾选时，立即清除 localStorage 里的凭据
                      // （下次进登录页就不会自动填了）
                      if (!checked) {
                        clearRememberedAccount();
                        setAutoFilled(false);
                      }
                    }}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                      remember
                        ? "border-amber bg-amber text-night"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
                    }`}
                  >
                    {remember && (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={
                      remember
                        ? "text-foreground"
                        : "hover:text-foreground transition-colors"
                    }
                  >
                    记住我
                  </span>
                </label>

                {/* 已自动填充的友好提示 */}
                {autoFilled && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-bright"
                    title="已从本机自动填充凭据，点击「登录」即可"
                  >
                    <svg
                      className="h-2.5 w-2.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    已记住
                  </motion.span>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-shimmer mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
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
                  登录中...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  登录
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* 分割线 */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgb(var(--border))]" />
            <span className="text-xs uppercase tracking-widest text-[rgb(var(--muted-foreground))]">
              或者
            </span>
            <div className="h-px flex-1 bg-[rgb(var(--border))]" />
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={isGitHubLoading}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm font-medium transition-all hover:border-amber hover:text-amber-bright hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGitHubLoading ? (
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
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
              </svg>
            )}
            GitHub 登录
          </button>

          {/* 注册链接 */}
          <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
            还没有账号？{" "}
            <Link
              href="/register"
              className="font-medium text-amber-bright hover:text-amber underline underline-offset-2"
            >
              立即注册
            </Link>
          </p>
        </div>

        {/* 底部小字提示 */}
        <p className="mt-6 text-center text-xs text-[rgb(var(--muted-foreground))]">
          登录即表示你同意我们的
          <Link
            href="/terms"
            className="mx-1 underline underline-offset-2 hover:text-amber-bright"
          >
            服务条款
          </Link>
          和
          <Link
            href="/privacy"
            className="mx-1 underline underline-offset-2 hover:text-amber-bright"
          >
            隐私政策
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
