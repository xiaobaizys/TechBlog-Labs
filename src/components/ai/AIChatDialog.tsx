"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { useCurrentPage } from "./useCurrentPage";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: { title: string; slug: string }[];
  /**
   * 稳定 id：用于 React key 和 abort 时定位。
   * - 初始欢迎消息用负数（不会和递增 id 撞）
   * - 用户消息用 timestamp（每个会话单调）
   * - assistant 消息用全局自增 id
   */
  _id: number;
};

type Tab = "chat" | "image";

/* ============================================================
   ReactMarkdown 渲染器（模块级常量，避免每次渲染重建）
   ============================================================ */
const MARKDOWN_COMPONENTS = {
  a: ({ ...p }: any) => (
    <a {...p} target="_blank" rel="noopener noreferrer" className="text-amber-bright underline" />
  ),
  code: ({ ...p }: any) => (
    <code {...p} className="rounded bg-[rgb(var(--background))] px-1 py-0.5 font-mono text-xs" />
  ),
};

/* ============================================================
   建议问题 chips（首屏 / 空状态展示）
   ============================================================ */
const SUGGESTED_QUESTIONS = [
  "这篇文章讲了什么？",
  "博客里有没有讲过 Next.js？",
  "总结一下最近的文章",
  "推荐一些项目给我看",
] as const;

/* ============================================================
   小图标（本地内联，避免再引 lucide）
   ============================================================ */
const SparkleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
  </svg>
);
const ChatIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);
const ImageIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const StopIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const RotateCcwIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
  </svg>
);

/* ============================================================
   组件
   ============================================================ */
export function AIChatDialog({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const page = useCurrentPage();
  const [tab, setTab] = useState<Tab>("chat");
  const isLoggedIn = !!session?.user;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好呀~ 我是博客小精灵 ✨\n\n可以问我关于博客内容的问题，比如：\n- 这篇文章讲了什么？\n- 博客里有没有讲过 XXX？\n- 帮我总结一下最近的文章…",
      _id: -1,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- 聊天记录持久化 ----
  const [sessions, setSessions] = useState<
    { id: string; title: string; messageCount: number; updatedAt: string }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  // 当前对话的用户消息计数器（用于首次保存时判断是否为新 session 触发标题）
  const userMsgCountRef = useRef(0);

  // 用于：
  //   1. 稳定 id 自增（避免 key={i} 破坏流式 diff）
  //   2. 在组件卸载 / 重新发送时 abort 掉旧请求
  const idCounterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // 记住最后一次用户提问，供"重试"按钮使用
  const lastUserTextRef = useRef<string>("");

  // 只更新最后一条 assistant 消息的内容（避免整列重渲染）
  const setLastAssistantContent = useCallback(
    (assistantId: number, content: string, sources?: { title: string; slug: string }[]) => {
      setMessages((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === "assistant" && prev[i]._id === assistantId) {
            if (prev[i].content === content && prev[i].sources === sources) return prev;
            const updated = prev.slice();
            updated[i] = { ...prev[i], content, sources };
            return updated;
          }
        }
        return prev;
      });
    },
    []
  );

  // 组件卸载 / dialog 关闭时中止进行中的请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  // ---- 加载用户会话列表 + 最近一次对话 ----
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const load = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch("/api/ai/chat/history");
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !json.data?.length) return;

        const list = json.data as {
          id: string;
          title: string;
          messageCount: number;
          updatedAt: string;
        }[];
        if (cancelled) return;
        setSessions(list);

        // 自动加载最近一次会话
        const latest = list[0];
        const msgRes = await fetch(`/api/ai/chat/history/${latest.id}`);
        if (!msgRes.ok) return;
        const msgJson = await msgRes.json();
        if (!msgJson.success || !msgJson.data) return;

        const loaded = (msgJson.data.messages as { role: string; content: string; sources?: { title: string; slug: string }[] }[])
          .filter((m) => m.role === "user" || m.role === "assistant");

        if (cancelled || loaded.length === 0) return;

        // 将加载的消息转为 Message 格式
        const restored: Message[] = loaded.map((m, i) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources,
          _id: -(i + 2), // 用负数 id 避免与新的递增 id 冲突
        }));
        // 重置 id 计数器到加载的消息数量
        idCounterRef.current = restored.length;
        userMsgCountRef.current = restored.filter((m) => m.role === "user").length;

        if (cancelled) return;
        setMessages(restored);
        setCurrentSessionId(latest.id);
      } catch {
        // 静默失败
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // ---- 保存一轮对话到后端 ----
  const saveHistory = useCallback(
    async (
      userMessage: string,
      assistantContent: string,
      sources?: { title: string; slug: string }[]
    ) => {
      if (!isLoggedIn) return;
      try {
        const res = await fetch("/api/ai/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            userMessage,
            assistantContent,
            sources,
          }),
        });
        const json = await res.json();
        if (json.success && json.data?.sessionId) {
          const newId = json.data.sessionId;
          // 如果是新 session，记录 id
          if (newId !== currentSessionId) {
            setCurrentSessionId(newId);
          }
          // 刷新会话列表
          const listRes = await fetch("/api/ai/chat/history");
          if (listRes.ok) {
            const listJson = await listRes.json();
            if (listJson.success) setSessions(listJson.data);
          }
        }
      } catch {
        // 静默失败
      }
    },
    [isLoggedIn, currentSessionId]
  );

  // ---- 新对话 ----
  const newChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "你好呀~ 我是博客小精灵 ✨\n\n可以问我关于博客内容的问题，比如：\n- 这篇文章讲了什么？\n- 博客里有没有讲过 XXX？\n- 帮我总结一下最近的文章…",
        _id: -1,
      },
    ]);
    setCurrentSessionId(null);
    idCounterRef.current = 0;
    userMsgCountRef.current = 0;
    setInput("");
    setQuota(null);
  }, []);

  // ---- 切换到指定会话 ----
  const switchSession = useCallback(async (sessionId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/ai/chat/history/${sessionId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

      const loaded = (json.data.messages as { role: string; content: string; sources?: { title: string; slug: string }[] }[])
        .filter((m) => m.role === "user" || m.role === "assistant");

      const restored: Message[] = loaded.map((m, i) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        sources: m.sources,
        _id: -(i + 2),
      }));

      idCounterRef.current = restored.length;
      userMsgCountRef.current = restored.filter((m) => m.role === "user").length;

      setMessages(restored);
      setCurrentSessionId(sessionId);
    } catch {
      // 静默失败
    } finally {
      setLoadingHistory(false);
      setShowSessions(false);
    }
  }, []);

  // ---- 删除会话 ----
  const deleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await fetch(`/api/ai/chat/history/${sessionId}`, { method: "DELETE" });
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) newChat();
      } catch {
        // 静默失败
      }
    },
    [currentSessionId, newChat]
  );

  // 最后一条 assistant 消息的 id（用于"思考中..."显示在哪一条）
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i]._id;
    }
    return -1;
  })();

  // 当前页面的友好名（用于给 AI 注入上下文 + 头部展示）
  const pageLabel = (() => {
    if (page.type === "blog" && page.title) return `文章 · ${page.title}`;
    if (page.type === "life" && page.title) return `生活 · ${page.title}`;
    if (page.type === "project" && page.title) return `项目 · ${page.title}`;
    if (page.type === "home") return "首页";
    return "当前页面";
  })();

  /**
   * 核心发送函数：text 可选，省略时取 input state
   *  - 用户敲回车：sendMessage()  ← 用 input
   *  - chip 点击：sendMessage("推荐一些项目给我看")  ← 注入预设文本
   *  - 重试：sendMessage(lastUserTextRef.current)
   */
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      // 如果有进行中的请求，先 abort 掉
      abortRef.current?.abort();

      // 给 user 消息一个稳定 id
      const userId = ++idCounterRef.current;
      const userMsg: Message = { role: "user", content: text, _id: userId };
      lastUserTextRef.current = text;
      setMessages((prev) => [...prev, userMsg]);
      // 仅有「用户实际输入」时清空输入框；chip / 重试不需清
      if (overrideText === undefined) setInput("");
      setLoading(true);

      // 添加空的 assistant 消息占位
      const assistantId = ++idCounterRef.current;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", _id: assistantId },
      ]);

      // 关键：每次发送都建一个 AbortController
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        // 携带当前页面上下文（让 RAG 知道用户在哪）
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            mode: "rag",
            context: {
              pageType: page.type,
              pageTitle: page.title,
              pageUrl: page.url,
            },
          }),
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`请求失败 (${res.status})`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应");

        const decoder = new TextDecoder();
        let buffer = "";
        let sources: { title: string; slug: string }[] = [];
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token") {
                fullContent += parsed.content;
                setLastAssistantContent(assistantId, fullContent, sources.length > 0 ? sources : undefined);
              } else if (parsed.type === "sources") {
                sources = JSON.parse(parsed.content);
                setLastAssistantContent(assistantId, fullContent, sources);
              } else if (parsed.type === "quota") {
                setQuota({ remaining: parsed.remaining, limit: parsed.limit });
              } else if (parsed.type === "error") {
                // 服务端推错误帧：不打断流，更新最后一条内容
                setLastAssistantContent(assistantId, `⚠️ ${parsed.content}`, sources);
              }
            } catch {
              // skip parse errors
            }
          }
        }

        // 流完成 → 自动保存到历史记录
        if (fullContent) {
          userMsgCountRef.current += 1;
          void saveHistory(text, fullContent, sources.length > 0 ? sources : undefined);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // 主动停止：保留已收到的内容；空消息时给个「已停止」标记
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && last._id === assistantId) {
              updated[updated.length - 1] = {
                ...last,
                content: last.content || "⏹ 已停止",
              };
            }
            return updated;
          });
        } else {
          // 其它错误（网络 / 500 / 解析失败）
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `⚠️ ${err.message || "网络错误"}`,
              _id: assistantId,
            };
            return updated;
          });
        }
      } finally {
        setLoading(false);
        if (abortRef.current === ac) abortRef.current = null;
      }
    },
    [input, loading, page.type, page.title, page.url, setLastAssistantContent, saveHistory]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /**
   * 手动停止当前生成：abort 请求并保留已收到的内容
   *  - 加载态按钮从「转圈」切换为「停止」
   */
  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  /**
   * 重试上一次提问（仅在非加载 + 存在历史提问时可用）
   */
  const retryLast = useCallback(() => {
    if (loading || !lastUserTextRef.current) return;
    void sendMessage(lastUserTextRef.current);
  }, [loading, sendMessage]);

  // chip 点击：直接用预设问题发送
  const handleChipClick = useCallback(
    (q: string) => {
      if (loading) return;
      void sendMessage(q);
    },
    [loading, sendMessage]
  );

  const limit = quota?.limit ?? (isLoggedIn ? 50 : 10);
  const remaining = quota?.remaining ?? limit;

  /* ============================================================
     渲染
     ============================================================ */
  return (
    <div className="flex h-[560px] max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-soft-lg">
      {/* ===== 头部：渐变 + 博客小精灵 ===== */}
      <div className="relative bg-gradient-to-br from-amber/20 via-amber-bright/15 to-pink-300/10 px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber to-amber-bright text-night shadow-amber">
              <SparkleIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight text-[rgb(var(--foreground))]">
                <span className="text-amber-bright">✦</span> 博客小精灵
              </h3>
              <p className="mt-0.5 text-[10px] leading-tight text-[rgb(var(--muted-foreground))]">
                可以问我当前页面相关问题，也可以生成一张小图
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* 新对话 — 仅登录用户显示 */}
            {isLoggedIn && (
              <button
                onClick={newChat}
                title="新对话"
                className="rounded-lg p-1.5 text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))]/60"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {/* 历史记录 — 仅登录用户显示 */}
            {isLoggedIn && (
              <button
                onClick={() => setShowSessions((v) => !v)}
                title="历史记录"
                className={`rounded-lg p-1.5 transition-all ${
                  showSessions
                    ? "bg-amber/20 text-amber-bright"
                    : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))]/60"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="关闭"
              className="rounded-lg p-1.5 text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))]/60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab + 当前页面 + 配额 */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Tab 段控件 */}
          <div className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))]/70 p-0.5 text-xs">
            <button
              onClick={() => setTab("chat")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                tab === "chat"
                  ? "bg-amber text-night shadow-sm"
                  : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
              }`}
            >
              <ChatIcon />
              <span>聊天</span>
            </button>
            <button
              onClick={() => setTab("image")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                tab === "image"
                  ? "bg-amber text-night shadow-sm"
                  : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
              }`}
            >
              <ImageIcon />
              <span>生图</span>
            </button>
          </div>

          {/* 当前页面（点击可跳转） */}
          <div
            className="flex max-w-[55%] items-center gap-1 truncate rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))]/70 px-2.5 py-1 text-[10px] text-[rgb(var(--muted-foreground))]"
            title={page.url}
          >
            <span className="shrink-0">📍</span>
            <span className="truncate">{pageLabel}</span>
          </div>
        </div>

        {/* 配额 + 登录入口（第二行） */}
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))]/70 px-2.5 py-1 text-[rgb(var(--muted-foreground))]">
          今日剩余：<span className="font-semibold text-amber-bright">{remaining}</span>/{limit} ·
            {isLoggedIn ? " 已登录" : " 登录后 50 次/天"}
          </span>
          {!isLoggedIn && (
            <Link
              href="/login?callbackUrl=/"
              onClick={onClose}
              className="rounded-full bg-amber px-3 py-1 text-[10px] font-semibold text-night transition-all hover:bg-amber-bright"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      {tab === "chat" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* 会话侧边栏 */}
          {showSessions && isLoggedIn && (
            <div className="w-44 shrink-0 overflow-y-auto border-r border-[rgb(var(--border))] bg-[rgb(var(--background))]/30 p-2">
              {loadingHistory ? (
                <div className="py-4 text-center text-[10px] text-[rgb(var(--muted-foreground))]">加载中...</div>
              ) : sessions.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-[rgb(var(--muted-foreground))]">暂无历史记录</div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => switchSession(s.id)}
                      className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-all ${
                        s.id === currentSessionId
                          ? "bg-amber/15 text-amber-bright font-medium"
                          : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))]/60 hover:text-[rgb(var(--foreground))]"
                      }`}
                    >
                      <span className="truncate flex-1">{s.title}</span>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="ml-1 shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-500"
                        title="删除"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 消息 + 输入 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto bg-[rgb(var(--background))]/40 px-4 py-4 space-y-3">
              {loadingHistory ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-xs text-[rgb(var(--muted-foreground))] animate-pulse">加载历史记录...</div>
                </div>
              ) : (
                <>
              {messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-amber to-amber-bright text-night"
                      : "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] border border-[rgb(var(--border))]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose-custom text-sm">
                      <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                        {msg.content || (loading && msg._id === lastAssistantId ? "思考中..." : "")}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* 错误态：显示「重试」按钮（仅在非加载时） */}
                  {msg.role === "assistant" &&
                    msg.content.startsWith("⚠️") &&
                    !loading && (
                      <button
                        type="button"
                        onClick={retryLast}
                        className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-100"
                      >
                        <RotateCcwIcon className="h-3 w-3" /> 重试
                      </button>
                    )}

                  {/* 来源链接 */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 border-t border-[rgb(var(--border))] pt-2">
                      <p className="text-[10px] text-[rgb(var(--muted-foreground))] mb-1">📚 参考文章：</p>
                      {msg.sources.map((s, j) => (
                        <Link
                          key={j}
                          href={`/blog/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-amber-bright hover:underline mt-0.5"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>)}
          </div>

          {/* 输入框 */}
          <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题…"
                disabled={loading}
                className="flex-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50 transition-all"
              />
              <button
                onClick={loading ? stopGenerating : () => sendMessage()}
                disabled={!loading && (!input.trim())}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold text-night transition-all disabled:opacity-50 ${
                  loading
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-gradient-to-br from-amber to-amber-bright hover:shadow-amber"
                }`}
                aria-label={loading ? "停止生成" : "发送"}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <StopIcon className="h-3.5 w-3.5" />
                    停止
                  </span>
                ) : (
                  "发送"
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[rgb(var(--muted-foreground))]">
              {isLoggedIn ? "已登录 · 思考中请耐心等待" : "未登录：不限制调用次数，但生成内容可能不稳定"}
            </p>
          </div>
        </div>
      </div>
      ) : (
        /* ===== 生图 Tab（占位） ===== */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[rgb(var(--background))]/40 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber/15 text-amber-bright">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[rgb(var(--foreground))]">生图功能即将上线</h4>
            <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              {"用自然语言描述想要的图片，AI 会为你生成。\n敬请期待 ✨"}
            </p>
          </div>
          <button
            disabled
            className="mt-2 cursor-not-allowed rounded-full border border-dashed border-[rgb(var(--border))] px-4 py-2 text-xs text-[rgb(var(--muted-foreground))]"
          >
            暂未开放
          </button>
        </div>
      )}
    </div>
  );
}
