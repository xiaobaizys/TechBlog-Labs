/**
 * 统一用户头像组件（server component, 零客户端 JS）
 *
 * 规则：
 *  1) 如果传了 image（且非空）→ 显示 <img>
 *  2) 否则 → 取 name 的首字符作为大写字母，配上基于 userId/name 的稳定 hash 配色
 *
 * 用法：
 *   <UserAvatar name={...} image={...} userId={...} size="md" />
 *   <UserAvatar name="张三" size="xl" ring />
 */

// ============================================================
// 配色盘：8 种稳定的"色对"（背景 15% 透明 + 前景实色）
// 在亮/暗主题下都能保持可读，且每个用户颜色稳定。
// ============================================================
const PALETTE = [
  { bg: "bg-amber/15",        fg: "text-amber-bright" },
  { bg: "bg-sky-500/15",      fg: "text-sky-500 dark:text-sky-400" },
  { bg: "bg-emerald-500/15",  fg: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-500/15",   fg: "text-violet-500 dark:text-violet-400" },
  { bg: "bg-rose-500/15",     fg: "text-rose-500 dark:text-rose-400" },
  { bg: "bg-cyan-500/15",     fg: "text-cyan-600 dark:text-cyan-400" },
  { bg: "bg-indigo-500/15",   fg: "text-indigo-500 dark:text-indigo-400" },
  { bg: "bg-orange-500/15",   fg: "text-orange-500 dark:text-orange-400" },
] as const;

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

// ============================================================
// djb2 字符串 hash → 稳定索引
// ============================================================
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

// ============================================================
// 取首字符（中英文都支持），空则用 "?"
// ============================================================
function getInitial(name?: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

// ============================================================
// 组件
// ============================================================
export function UserAvatar({
  name,
  image,
  userId,
  size = "md",
  ring = false,
  className = "",
}: {
  name?: string | null;
  image?: string | null;
  /** 用作用户唯一标识生成稳定 hash 配色（userId / email 均可） */
  userId?: string;
  size?: AvatarSize;
  ring?: boolean;
  className?: string;
}) {
  const seed = userId || name || "default";
  const palette = PALETTE[hashString(seed) % PALETTE.length];
  const sizeClass = SIZE_CLASSES[size];
  const ringClass = ring ? "ring-2 ring-[rgb(var(--border))]" : "";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name || "avatar"}
        className={`${sizeClass} rounded-full object-cover ${ringClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold ${sizeClass} ${palette.bg} ${palette.fg} ${ringClass} ${className}`}
      aria-hidden="true"
    >
      {getInitial(name)}
    </span>
  );
}

export default UserAvatar;
