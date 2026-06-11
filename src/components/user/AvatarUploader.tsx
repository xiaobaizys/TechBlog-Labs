"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserAvatar } from "./UserAvatar";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * 头像上传器
 *
 *  - 点击/hover 头像 → 弹出"更换"提示
 *  - 选图 → 客户端预校验 → /api/upload 拿 URL → PUT /api/user/avatar 写 DB
 *  - 成功 → router.refresh() + useSession().update() 刷新 JWT
 *  - 提供"重置"按钮（用默认头像）
 */
export function AvatarUploader({
  name,
  image,
  userId,
  size = "xl",
}: {
  name?: string | null;
  image?: string | null;
  userId: string;
  size?: "lg" | "xl";
}) {
  const router = useRouter();
  const { update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const trigger = () => {
    if (isPending) return;
    inputRef.current?.click();
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 清空 value 以便重复选同一张
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!ALLOWED.includes(file.type)) {
      setError("仅支持 jpg / png / webp / gif");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("文件不能超过 5MB");
      return;
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    startTransition(async () => {
      try {
        // 1) 上传文件
        const form = new FormData();
        form.append("image", file);
        const upRes = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await upRes.json();
        if (!upRes.ok || !upData.success) {
          setError(upData.message || "上传失败");
          setPreview(null);
          return;
        }

        // 2) 写入 user.image
        const putRes = await fetch("/api/user/avatar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: upData.data.url }),
        });
        const putData = await putRes.json();
        if (!putRes.ok || !putData.success) {
          setError(putData.message || "保存失败");
          setPreview(null);
          return;
        }

        // 3) 刷新：server 组件 + JWT
        setPreview(null);
        await update();   // 触发 jwt 回调，token.picture 更新
        router.refresh(); // 让 server component 拿到新 image
      } catch {
        setError("网络错误，请重试");
        setPreview(null);
      }
    });
  }

  function handleReset() {
    if (isPending) return;
    if (!confirm("确认恢复默认头像？")) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/avatar", { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "重置失败");
          return;
        }
        await update();
        router.refresh();
      } catch {
        setError("网络错误，请重试");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={trigger}
        disabled={isPending}
        className="group relative rounded-full focus:outline-none focus:ring-2 focus:ring-amber-bright focus:ring-offset-2 focus:ring-offset-background"
        aria-label="更换头像"
      >
        <UserAvatar
          name={name}
          image={preview || image}
          userId={userId}
          size={size}
          ring
          className={isPending ? "opacity-60" : ""}
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="px-2 text-center text-xs font-medium text-white">
            {isPending ? "上传中..." : "更换头像"}
          </span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        onChange={handleFileChange}
        disabled={isPending}
        className="hidden"
      />

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={trigger}
          disabled={isPending}
          className="font-medium text-amber-bright hover:underline disabled:opacity-50"
        >
          {isPending ? "处理中..." : "上传新头像"}
        </button>
        {image && !isPending && (
          <>
            <span className="text-[rgb(var(--muted-foreground))]">·</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[rgb(var(--muted-foreground))] hover:text-red-500"
            >
              使用默认
            </button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
        支持 jpg / png / webp / gif · ≤ 5MB
      </p>
    </div>
  );
}
