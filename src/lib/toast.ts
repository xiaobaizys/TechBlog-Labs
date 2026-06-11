"use client";

import { toast as sonnerToast } from "sonner";

/**
 * 集中导出 toast 工具
 *
 *  - 全局 Toaster 在 providers.tsx 里挂载
 *  - 任何客户端组件都可以直接 `import { toast } from "@/lib/toast"`
 *  - 我们用 Sonner 提供的语义化 API: success / error / info / warning / loading
 *
 *  包装的好处：
 *  1. 替换实现只改这里一处（未来换回 native toast 或 react-hot-toast 不用动业务代码）
 *  2. 统一默认参数（duration / position / 主题跟随）
 *  3. 业务侧写 `toast.success("保存成功")` 简洁、IDE 自动补全友好
 */
export const toast = {
  success: (message: string, opts?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(message, opts),
  error: (message: string, opts?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(message, opts),
  info: (message: string, opts?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(message, opts),
  warning: (message: string, opts?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(message, opts),
  /** 加载中：返回 id，配合 toast.dismiss(id) 用 */
  loading: (message: string, opts?: Parameters<typeof sonnerToast.loading>[1]) =>
    sonnerToast.loading(message, opts),
  /** 主动关闭一个 toast（通常配合 loading 用） */
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  /** Promise 风格：pending 时 loading，自动切换 success / error */
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) }
  ) =>
    sonnerToast.promise(promise, msgs),
};

export { Toaster } from "sonner";
