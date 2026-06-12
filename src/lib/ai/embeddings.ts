/**
 * 向量生成 — 使用 DeepSeek API
 *
 * DeepSeek 的 embedding 模型兼容 OpenAI API 格式。
 * 对于 RAG 系统，我们使用 DeepSeek 的文本生成能力进行
 * 语义理解，结合 PostgreSQL 全文检索进行文本匹配。
 */

import { getActiveAiProvider } from "./provider";

const DEFAULT_BASE = "https://api.deepseek.com";
/** DeepSeek 请求总超时（毫秒）—— 网络抖动时不会无限挂死 */
const REQUEST_TIMEOUT_MS = 30_000;
/** DeepSeek 非流式重试次数（不含首次） */
const RETRY_TIMES = 1;
/** 重试退避基数（毫秒），实际间隔 = base * 2^attempt */
const RETRY_BACKOFF_BASE_MS = 800;

/**
 * 等待指定毫秒
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 带超时 + 重试的 fetch 封装
 *  - 超时通过 AbortController + setTimeout 实现
 *  - 重试 1 次（指数退避），仅对网络错误 / 5xx 生效
 *  - 流式接口不在这里包（流式一旦断开没法重放 chunk，由调用方自己重试）
 */
async function fetchDeepSeek(
  body: Record<string, unknown>,
  stream: boolean,
  baseUrl: string,
  apiKey: string
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= RETRY_TIMES; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ac.signal,
        // Node 18+ (undici) 支持 keepalive 选项，无需 ts-expect-error
        keepalive: true,
      });
      clearTimeout(timer);

      // 5xx 或 429 触发重试；4xx 视为客户端错误直接抛
      if (!res.ok && (res.status >= 500 || res.status === 429) && attempt < RETRY_TIMES) {
        lastErr = new Error(`DeepSeek API ${res.status}`);
        await sleep(RETRY_BACKOFF_BASE_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < RETRY_TIMES) {
        await sleep(RETRY_BACKOFF_BASE_MS * 2 ** attempt);
        continue;
      }
      // 非流式可以重抛；流式降级为 yield 错误消息
      if (stream) {
        // 让流式路径自己 yield 错误；这里只重抛超时等原始错误
        throw lastErr;
      }
      throw lastErr;
    }
  }
  // 不可达
  throw lastErr instanceof Error ? lastErr : new Error("DeepSeek fetch failed");
}

/**
 * 调用 DeepSeek API（非流式）
 */
export async function callDeepSeek(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const provider = await getActiveAiProvider();
  if (!provider) {
    throw new Error("AI 未配置：请在管理后台添加 AI 提供商或设置 DEEPSEEK_API_KEY 环境变量");
  }

  const res = await fetchDeepSeek(
    {
      model: provider.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    },
    false,
    provider.baseUrl,
    provider.apiKey
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * 调用 DeepSeek API（流式 SSE）
 *  - 流式一旦断开无法重放 chunk，所以只做超时，不做重试
 *  - 超时后 yield 一条用户可读的错误消息
 */
export async function* streamDeepSeek(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; max_tokens?: number }
): AsyncGenerator<string> {
  const provider = await getActiveAiProvider();
  if (!provider) {
    yield "AI 未配置：请在管理后台添加 AI 提供商或设置 DEEPSEEK_API_KEY 环境变量";
    return;
  }

  let res: Response;
  try {
    res = await fetchDeepSeek(
      {
        model: provider.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000,
        stream: true,
      },
      true,
      provider.baseUrl,
      provider.apiKey
    );
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "DeepSeek 请求超时（30s）" : `DeepSeek 请求失败: ${err?.message ?? err}`;
    yield msg;
    return;
  }

  if (!res.ok) {
    yield `API 调用失败: ${res.status}`;
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield "无法读取响应流";
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
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
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip parse errors
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 文本分块
 */
export function chunkText(text: string, maxLength: number = 800): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + "\n\n" + trimmed).length > maxLength && current) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }

    // 如果单段超过 maxLength，强制切分
    while (current.length > maxLength * 1.5) {
      const splitPoint = current.lastIndexOf("\n", maxLength);
      const cutAt = splitPoint > maxLength / 2 ? splitPoint : maxLength;
      chunks.push(current.slice(0, cutAt).trim());
      current = current.slice(cutAt).trim();
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * 简单的文本相似度匹配（基于关键词共现）
 * 当 pgvector 不可用时，使用此方法进行检索
 */
export function keywordSearch(query: string, chunks: string[], topK: number = 3): { index: number; score: number; content: string }[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

  const scored = chunks.map((chunk, index) => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lowerChunk.match(regex);
      if (matches) score += matches.length;
    }
    // 奖励精确匹配
    if (lowerChunk.includes(query.toLowerCase())) score += 5;
    return { index, score, content: chunk };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
