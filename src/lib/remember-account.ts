/**
 * 记住密码 工具
 *
 *  - 把账号 + 密码持久化到 localStorage
 *  - 带过期时间（默认 30 天）
 *  - 用 base64 做轻量混淆（不是真正的加密，密码本质上就是明文存浏览器里）
 *    任何能在浏览器里跑 JS 的扩展 / 调试器都能读出来——
 *    这是「记住密码」类功能绕不过去的取舍。最佳实践是：
 *    让浏览器 / 1Password / Bitwarden 等专业工具去记住。
 *    这个功能只是给非专业用户的轻量兜底。
 *
 *  - 不存任何 token / session（cookie 已经由 next-auth 接管，30 天有效）
 */

const STORAGE_KEY = "vitalog:remembered-account";
const EXPIRY_DAYS = 30;

export type RememberedAccount = {
  /** 邮箱或用户名（与 mode 配合） */
  identifier: string;
  /** 密码（base64 编码） */
  password: string;
  /** 登录模式：email / username */
  mode: "email" | "username";
  /** 保存时间戳（毫秒） */
  savedAt: number;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
};

function encode(pwd: string): string {
  // unescape(encodeURIComponent) 是为了支持中文 / emoji 等非 ASCII 字符
  return typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(pwd)))
    : Buffer.from(pwd, "utf-8").toString("base64");
}

function decode(b64: string): string {
  try {
    return typeof atob === "function"
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/** 读取记住的账号（已自动校验是否过期） */
export function loadRememberedAccount(): RememberedAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RememberedAccount;
    // 校验过期
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // 校验必要字段
    if (!parsed.identifier || !parsed.password) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // 解码密码
    return {
      ...parsed,
      password: decode(parsed.password),
    };
  } catch {
    return null;
  }
}

/** 记住账号 */
export function saveRememberedAccount(
  identifier: string,
  password: string,
  mode: "email" | "username"
): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const data: RememberedAccount = {
      identifier: identifier.trim(),
      password: encode(password),
      mode,
      savedAt: now,
      expiresAt: now + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* 忽略 localStorage 异常（隐私模式 / 容量满） */
  }
}

/** 清除记住的账号 */
export function clearRememberedAccount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 是否已记住账号（UI 展示用） */
export function hasRememberedAccount(): boolean {
  return loadRememberedAccount() !== null;
}
