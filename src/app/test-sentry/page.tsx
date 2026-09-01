"use client";

import { useState } from "react";
import { reportError, addBreadcrumb } from "@/lib/sentry";

/**
 * Sentry 测试页面
 *
 * 访问: /test-sentry
 *
 * 功能:
 * - 测试错误捕获
 * - 测试面包屑记录
 * - 测试用户标识
 */
export default function TestSentryPage() {
  const [testResult, setTestResult] = useState<string>("");

  const testErrorCapture = () => {
    addBreadcrumb("test", "点击测试错误捕获按钮", "info");

    try {
      throw new Error("测试错误: Sentry 错误捕获测试");
    } catch (error) {
      reportError(error as Error, {
        test: true,
        timestamp: new Date().toISOString(),
      });
      setTestResult("✅ 错误已发送到 Sentry，请检查控制台和 Sentry 后台");
    }
  };

  const testUnhandledError = () => {
    addBreadcrumb("test", "点击测试未处理错误按钮", "info");

    // 这个错误会被 Sentry 自动捕获
    throw new Error("测试未处理错误: 这应该被 Sentry 自动捕获");
  };

  const testPromiseRejection = () => {
    addBreadcrumb("test", "点击测试 Promise rejection 按钮", "info");

    // 这个 Promise rejection 会被 Sentry 自动捕获
    Promise.reject(new Error("测试 Promise rejection"));
  };

  const testCustomEvent = () => {
    addBreadcrumb("user", "用户点击了测试自定义事件按钮", "info");
    addBreadcrumb("navigation", "访问 /test-sentry", "info");
    addBreadcrumb("api", "POST /api/test", "info");

    setTestResult("✅ 面包屑已添加，请在 Sentry 错误详情中查看");
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="mb-8 text-3xl font-bold">Sentry 测试页面</h1>

      <div className="space-y-4">
        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="mb-4 text-xl font-semibold">错误捕获测试</h2>
          <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
            测试 Sentry 是否正确捕获错误
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={testErrorCapture}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-white hover:bg-amber-bright transition-colors"
            >
              测试错误捕获
            </button>

            <button
              onClick={testUnhandledError}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
            >
              测试未处理错误
            </button>

            <button
              onClick={testPromiseRejection}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              测试 Promise Rejection
            </button>

            <button
              onClick={testCustomEvent}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              测试面包屑记录
            </button>
          </div>
        </div>

        {testResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {testResult}
          </div>
        )}

        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="mb-4 text-xl font-semibold">配置说明</h2>

          <div className="space-y-3 text-sm text-[rgb(var(--muted-foreground))]">
            <p>
              <strong>1. 配置 DSN:</strong> 在 <code>.env.local</code> 中添加{" "}
              <code>SENTRY_DSN</code>
            </p>
            <p>
              <strong>2. 查看错误:</strong> 登录{" "}
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber underline"
              >
                sentry.io
              </a>{" "}
              查看捕获的错误
            </p>
            <p>
              <strong>3. 面包屑:</strong> 在错误详情中查看用户操作路径
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="mb-4 text-xl font-semibold">环境状态</h2>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">SENTRY_DSN:</span>{" "}
              {process.env.SENTRY_DSN ? (
                <span className="text-green-600">已配置</span>
              ) : (
                <span className="text-rose-500">未配置</span>
              )}
            </p>
            <p>
              <span className="font-medium">NODE_ENV:</span>{" "}
              <span className="text-blue-600">{process.env.NODE_ENV}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
