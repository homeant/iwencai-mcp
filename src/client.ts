/**
 * 问财 (Iwencai) OpenAPI 客户端 — 两个真实 HTTP 操作。
 *
 * 四个 skill 底层的全部请求都收敛到这里:
 *  - query2data(行情/行业):  POST /v1/query2data
 *  - search(资讯/公告):      POST /v1/comprehensive/search
 *
 * 严格遵循网关规范: 每次请求携带 X-Claw-* headers,
 * X-Claw-Trace-Id 为 64 字符十六进制唯一 ID, Authorization Bearer 仅从环境变量读取。
 */
import { randomBytes } from "node:crypto";

export interface IWENCaiOptions {
  apiKey: string;
  /** 默认 https://openapi.iwencai.com */
  baseUrl?: string;
  /** 默认 30000 (ms) */
  timeoutMs?: number;
}

export interface Query2DataArgs {
  query: string;
  page?: string;
  limit?: string;
}

export interface SearchArgs {
  query: string;
  size?: string;
}

const DEFAULT_BASE_URL = "https://openapi.iwencai.com";

function traceId(): string {
  return randomBytes(32).toString("hex"); // 64 个十六进制字符
}

function clawHeaders(apiKey: string, skillId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Claw-Call-Type": "normal",
    "X-Claw-Skill-Id": skillId,
    "X-Claw-Skill-Version": "1.0.0",
    "X-Claw-Plugin-Id": "none",
    "X-Claw-Plugin-Version": "none",
    "X-Claw-Trace-Id": traceId(),
  };
}

async function post(
  path: string,
  body: Record<string, unknown>,
  opts: IWENCaiOptions,
  skillId: string
): Promise<Record<string, unknown>> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}${path}`;
  const headers = clawHeaders(opts.apiKey, skillId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: Record<string, unknown> = { _http_status: response.status };
    if (text) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          payload = { ...(parsed as Record<string, unknown>), _http_status: response.status };
        } else {
          payload = { data: parsed, _http_status: response.status };
        }
      } catch {
        payload = { text_response: text, _http_status: response.status };
      }
    }
    return { ...payload, trace_id: headers["X-Claw-Trace-Id"], _http_status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[${skillId}] 请求失败: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 行情 / 行业查询: POST /v1/query2data */
export function query2data(
  args: Query2DataArgs,
  opts: IWENCaiOptions,
  skillId: string
): Promise<Record<string, unknown>> {
  const { query, page = "1", limit = "10" } = args;
  return post(
    "/v1/query2data",
    { query, page, limit, is_cache: "1", expand_index: "true" },
    opts,
    skillId
  );
}

/** 资讯 / 研报 / 公告搜索: POST /v1/comprehensive/search */
export function search(
  args: SearchArgs,
  opts: IWENCaiOptions,
  channel: "news" | "announcement" | "report"
): Promise<Record<string, unknown>> {
  const { query, size = "10" } = args;
  const body = { query, channels: [channel], app_id: "AIME_SKILL", size };
  const skillIdMap: Record<string, string> = {
    news: "news-search",
    announcement: "announcement-search",
    report: "report-search",
  };
  const skillId = skillIdMap[channel];
  return post("/v1/comprehensive/search", body, opts, skillId);
}
