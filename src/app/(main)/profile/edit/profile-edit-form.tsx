"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Loader2, Check, AlertCircle } from "lucide-react";

type Props = {
  userId: string;
  initialName: string;
  initialEmail: string;
};

/**
 * 个人资料编辑表单（客户端组件）
 *
 * 行为：
 *  - 加载时用 initialName / initialEmail 填充
 *  - 改动时：name / email 两个字段有"未保存"提示
 *  - 保存：PUT /api/user/profile → 成功后 useSession().update() 刷新顶栏头像/名字
 *  - 取消：还原 initial 值
 *
 * 错误展示：使用 framer-motion 让 success / error 消息平滑淡入淡出
 */
export function ProfileEditForm({ userId, initialName, initialEmail }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // 进入页面自动 focus 昵称
  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const dirty = name.trim() !== initialName.trim() || email.trim() !== initialEmail.trim();

  function handleCancel() {
    setName(initialName);
    setEmail(initialEmail);
    setStatus(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setStatus({ kind: "error", message: "昵称不能为空" });
      return;
    }
    if (trimmedName.length > 32) {
      setStatus({ kind: "error", message: "昵称最长 32 个字符" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail === "" ? null : trimmedEmail,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };

        if (!res.ok || !json.success) {
          setStatus({
            kind: "error",
            message: json.message ?? `保存失败 (${res.status})`,
          });
          return;
        }

        setStatus({ kind: "success", message: json.message ?? "已保存" });

        // 刷新 session（顶栏头像/名字立即更新）
        try {
          await update();
        } catch {
          /* 即便 session 刷新失败，数据也已写入 */
        }

        // 让 /profile 页面看到最新数据
        router.refresh();
      } catch (err) {
        console.error("[profile edit]", err);
        setStatus({ kind: "error", message: "网络错误，请重试" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field
        label="昵称"
        hint="1 ~ 32 字符，会显示在评论、文章作者等位置"
        required
      >
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          autoComplete="name"
          placeholder="给自己起个名字"
          className="theme-input"
          required
        />
      </Field>

      <Field
        label="邮箱"
        hint="用于通知和找回账号；留空则不设置；修改后需要重新验证"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="theme-input"
        />
      </Field>

      {/* 状态提示 */}
      <AnimatePresence mode="wait">
        {status && (
          <motion.div
            key={status.kind + status.message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              status.kind === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
            role={status.kind === "error" ? "alert" : "status"}
          >
            {status.kind === "success" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!dirty || isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3.5 py-2 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:border-amber hover:text-amber-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" />
          取消
        </button>
        <button
          type="submit"
          disabled={!dirty || isPending}
          className="btn-shimmer inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存修改
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
 *  Field · 表单字段
 * ============================================================ */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-[rgb(var(--foreground))]">
        <span>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-[rgb(var(--muted-foreground))]">
          {hint}
        </span>
      )}
    </label>
  );
}
