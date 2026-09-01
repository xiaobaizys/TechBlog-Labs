"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 推送通知 Hook
 *
 * 功能：
 * - 检查推送通知支持
 * - 请求通知权限
 * - 订阅/取消订阅
 * - 发送测试通知
 */

interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
}

export function usePushNotification() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "default",
    subscribed: false,
    loading: false,
  });

  // 检查支持
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setState((prev) => ({
      ...prev,
      supported,
      permission: supported ? Notification.permission : "denied",
    }));
  }, []);

  // 检查订阅状态
  useEffect(() => {
    if (!state.supported) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState((prev) => ({ ...prev, subscribed: !!subscription }));
      } catch (error) {
        console.error("Failed to check subscription:", error);
      }
    };

    checkSubscription();
  }, [state.supported]);

  // 请求权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission === "granted";
    } catch (error) {
      console.error("Failed to request permission:", error);
      return false;
    }
  }, [state.supported]);

  // 订阅
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // 请求权限
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // 获取 VAPID 公钥
      const res = await fetch("/api/push/vapid-key");
      if (!res.ok) throw new Error("Failed to get VAPID key");

      const { publicKey } = await res.json();
      if (!publicKey) throw new Error("VAPID key not configured");

      // 获取 Service Worker 注册
      const registration = await navigator.serviceWorker.ready;

      // 订阅
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 发送订阅到服务器
      const subscribeRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!subscribeRes.ok) throw new Error("Failed to save subscription");

      setState((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("Failed to subscribe:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.supported, requestPermission]);

  // 取消订阅
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // 通知服务器
      await fetch("/api/push/subscribe", { method: "DELETE" });

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.supported]);

  // 发送测试通知
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          notification: {
            title: "测试通知",
            body: "这是一条测试通知",
            url: "/",
          },
        }),
      });

      return res.ok;
    } catch (error) {
      console.error("Failed to send test notification:", error);
      return false;
    }
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

/**
 * 将 Base64 字符串转换为 Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer as ArrayBuffer;
}
