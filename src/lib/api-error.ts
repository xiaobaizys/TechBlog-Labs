import { NextResponse } from "next/server";

/**
 * 统一 API 错误处理模块
 *
 * 设计：
 *  - 统一错误响应格式
 *  - 可选 Sentry 上报
 *  - 开发环境打印详细错误信息
 */

// 错误响应格式
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
}

/**
 * 处理 API 错误
 *
 * @param error - 捕获的错误对象
 * @param route - API 路由路径（用于日志）
 * @param options - 配置选项
 * @returns NextResponse 错误响应
 */
export function handleApiError(
  error: unknown,
  route: string,
  options: {
    status?: number;
    message?: string;
    code?: string;
    reportToSentry?: boolean;
  } = {}
): NextResponse<ErrorResponse> {
  const {
    status = 500,
    message = "服务器内部错误",
    code,
    reportToSentry = false,
  } = options;

  // 打印错误日志
  console.error(`[${route}]`, error);

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    success: false,
    message,
  };

  // 开发环境添加错误详情
  if (process.env.NODE_ENV === "development") {
    errorResponse.error = error instanceof Error ? error.message : String(error);
  }

  // 添加错误代码
  if (code) {
    errorResponse.code = code;
  }

  // Sentry 上报（如果启用）
  if (reportToSentry && error instanceof Error) {
    reportError(error, { route });
  }

  return NextResponse.json(errorResponse, { status });
}

/**
 * 上报错误到 Sentry
 *
 * 注意：需要配置 SENTRY_DSN 环境变量
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  // 检查是否配置了 Sentry
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    // 动态导入 Sentry（避免未安装时崩溃）
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.withScope((scope) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
        Sentry.captureException(error);
      });
    }).catch(() => {
      // Sentry 未安装时忽略
    });
  } catch {
    // 忽略 Sentry 错误
  }
}

/**
 * 创建成功响应
 */
export function handleApiSuccess<T>(
  data: T,
  options: {
    status?: number;
    message?: string;
  } = {}
): NextResponse<{ success: true; data: T; message?: string }> {
  const { status = 200, message } = options;

  const response: { success: true; data: T; message?: string } = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * 创建分页响应
 */
export function handleApiPaginatedSuccess<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  },
  options: {
    status?: number;
  } = {}
): NextResponse<{
  success: true;
  data: T[];
  pagination: typeof pagination;
}> {
  const { status = 200 } = options;

  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    { status }
  );
}

/**
 * 验证请求参数
 */
export function validateRequired(
  params: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter((field) => {
    const value = params[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * 处理认证错误
 */
export function handleAuthError(
  message: string = "请先登录"
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, message },
    { status: 401 }
  );
}

/**
 * 处理权限错误
 */
export function handleForbiddenError(
  message: string = "权限不足"
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, message },
    { status: 403 }
  );
}

/**
 * 处理未找到错误
 */
export function handleNotFoundError(
  message: string = "资源不存在"
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, message },
    { status: 404 }
  );
}

/**
 * 处理请求参数错误
 */
export function handleBadRequestError(
  message: string = "请求参数错误"
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, message },
    { status: 400 }
  );
}
