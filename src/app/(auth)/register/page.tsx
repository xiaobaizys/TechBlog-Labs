"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================================
 *  注册页 · 提交后自动登录
 * ------------------------------------------------------------
 *  状态机：
 *    idle                —— 等待用户填写
 *    submitting          —— 调 POST /api/auth/register
 *    registered          —— 注册成功，等待自动登录
 *    auto-logging-in     —— 调 signIn("credentials")
 *    success             —— 自动登录成功，即将跳转
 *    error               —— 任意阶段失败，提示用户
 * ============================================================ */

type Status =
  | "idle"
  | "submitting"
  | "registered"
  | "auto-logging-in"
  | "success"
  | "error";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [touched, setTouched] = useState<{
    email?: boolean;
    name?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  /* ============================================================
   *  实时字段校验（与登录页风格统一）
   * ============================================================ */
  const validation = useMemo(() => {
    const e: {
      email?: string;
      name?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      e.email = "请输入邮箱";
    } else if (!EMAIL_RE.test(email.trim())) {
      e.email = "邮箱格式不正确";
    }

    if (!name.trim()) {
      e.name = "请输入昵称";
    } else if (name.trim().length > 50) {
      e.name = "昵称最长 50 个字符";
    }

    if (!password) {
      e.password = "请输入密码";
    } else if (password.length < 6) {
      e.password = "密码至少 6 个字符";
    } else if (password.length > 100) {
      e.password = "密码最长 100 个字符";
    }

    if (!confirmPassword) {
      e.confirmPassword = "请再次输入密码";
    } else if (password && confirmPassword !== password) {
      e.confirmPassword = "两次输入的密码不一致";
    }

    return e;
  }, [email, name, password, confirmPassword]);

  const showEmailErr = touched.email && !!validation.email;
  const showNameErr = touched.name && !!validation.name;
  const showPwdErr = touched.password && !!validation.password;
  const showConfirmErr = touched.confirmPassword && !!validation.confirmPassword;
  const isFormValid =
    !validation.email &&
    !validation.name &&
    !validation.password &&
    !validation.confirmPassword;

  const isBusy =
    status === "submitting" || status === "registered" || status === "auto-logging-in";

  /* ============================================================
   *  自动登录：注册成功后用相同凭据调 signIn
   *  - signIn 走 next-auth 的 credentials provider
   *  - 成功则 next-auth 自动写入 httpOnly session cookie + 服务端重定向
   *  - 失败则保留在注册页，提示用户手动去登录
   *
   *  关键：必须传 callbackUrl，否则 next-auth 会用 pages.signIn (= /register) 作默认值，
   *        跳转回注册页形成死循环。
   *
   *  关键：用 redirect: true 让 next-auth 服务端原生重定向
   *        跳过 router.push 的 race condition
   * ============================================================ */
  async function autoLogin() {
    setStatus("auto-logging-in");
    try {
      // signIn(redirect: true) 成功时不会返回，
      // 浏览器会被 next-auth 服务端 302 到 callbackUrl
      // 失败时会抛 CredentialsSignin（被下方 catch 兜住）
      await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: true,
      });
      // 这行不会执行（redirect: true 成功时浏览器已跳走）
      setStatus("success");
    } catch (err) {
      // next-auth v4 在 redirect: true 失败时，浏览器实际跳到 /login?error=...
      // 这里的 err 可能是序列化后的对象，也可能是 Error
      const e = err as { type?: string; err?: { type?: string } };
      const errorType = e?.type || e?.err?.type || (err as Error)?.message;
      setStatus("error");
      setError(
        errorType === "CredentialsSignin"
          ? "自动登录失败，请前往登录页手动登录"
          : "自动登录失败，请前往登录页手动登录"
      );
    }
  }

  /* ============================================================
   *  提交注册
   * ============================================================ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError("");
    setTouched({
      email: true,
      name: true,
      password: true,
      confirmPassword: true,
    });
    if (!isFormValid) {
      setError(
        validation.email ||
          validation.name ||
          validation.password ||
          validation.confirmPassword ||
          "请检查表单内容"
      );
      return;
    }

    startTransition(async () => {
      setStatus("submitting");
      try {
        /* ---------- 1. 注册 ---------- */
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim(),
            password,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setError(data.message || "注册失败，请稍后重试");
          return;
        }

        /* ---------- 2. 注册成功 → 自动登录 ---------- */
        setStatus("registered");
        await autoLogin();
      } catch {
        setStatus("error");
        setError("网络错误，请检查网络连接后重试");
      }
    });
  }

  /* ============================================================
   *  状态文案
   * ============================================================ */
  const submitLabel = (() => {
    switch (status) {
      case "submitting":
        return "注册中...";
      case "registered":
        return "注册成功 · 准备登录...";
      case "auto-logging-in":
        return "正在自动登录...";
      case "success":
        return "登录成功 · 跳转中...";
      default:
        return "注册并自动登录";
    }
  })();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm theme-card p-8"
      >
        {/* 标题 */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3">
            — Sign up
          </p>
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            创建账号
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
            注册后自动登录，无需重复输入密码
          </p>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="alert"
              className="mb-6 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            >
              {error}
              {status === "error" && (
                <div className="mt-2 text-xs">
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="font-medium underline underline-offset-2"
                  >
                    前往登录页
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 成功 / 进度提示 */}
        <AnimatePresence>
          {(status === "registered" ||
            status === "auto-logging-in" ||
            status === "success") && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 rounded-lg border border-green-300/60 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
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
                <span>
                  {status === "registered" && "注册成功，正在为你自动登录..."}
                  {status === "auto-logging-in" &&
                    "正在自动登录，请稍候..."}
                  {status === "success" && "登录成功，正在跳转..."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 注册表单 */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* 邮箱 */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              disabled={isBusy}
              placeholder="your@email.com"
              className={`w-full rounded-lg border bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                showEmailErr
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[rgb(var(--border))] focus:border-amber focus:ring-amber/20"
              }`}
            />
            {showEmailErr && (
              <p className="mt-1.5 text-xs text-red-500">
                {validation.email}
              </p>
            )}
          </div>

          {/* 昵称 */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium"
            >
              昵称
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              disabled={isBusy}
              placeholder="你的昵称"
              className={`w-full rounded-lg border bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                showNameErr
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[rgb(var(--border))] focus:border-amber focus:ring-amber/20"
              }`}
            />
            {showNameErr && (
              <p className="mt-1.5 text-xs text-red-500">
                {validation.name}
              </p>
            )}
          </div>

          {/* 密码 */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              disabled={isBusy}
              placeholder="至少 6 个字符"
              className={`w-full rounded-lg border bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                showPwdErr
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[rgb(var(--border))] focus:border-amber focus:ring-amber/20"
              }`}
            />
            {showPwdErr && (
              <p className="mt-1.5 text-xs text-red-500">
                {validation.password}
              </p>
            )}
          </div>

          {/* 确认密码 */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium"
            >
              确认密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({
                ...t,
                confirmPassword: true,
              }))}
              disabled={isBusy}
              placeholder="再次输入密码"
              className={`w-full rounded-lg border bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                showConfirmErr
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[rgb(var(--border))] focus:border-amber focus:ring-amber/20"
              }`}
            />
            {showConfirmErr && (
              <p className="mt-1.5 text-xs text-red-500">
                {validation.confirmPassword}
              </p>
            )}
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isBusy}
            className="btn-shimmer w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
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
                {submitLabel}
              </span>
            ) : (
              "注册并自动登录"
            )}
          </button>
        </form>

        {/* 登录链接 */}
        <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
          已有账号？{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-amber-bright hover:text-amber underline underline-offset-2"
          >
            立即登录
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
