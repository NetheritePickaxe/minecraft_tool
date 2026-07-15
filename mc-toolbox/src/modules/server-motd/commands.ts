// Tauri command 调用封装
// - Tauri 环境（桌面/移动端）：调用后端 query_motd 走原生 TCP/UDP 协议
// - Web 环境：调用 mcsrvstat.us 公共 API（CORS 友好，无需 key）

import { invoke } from "@tauri-apps/api/core";

export type Edition = "java" | "bedrock";

export interface MotdQuery {
  edition: Edition;
  host: string;
  port: number | null;
}

export interface PlayerSample {
  name: string;
  id: string;
}

export interface MotdResult {
  edition: string;
  description: string;
  online: number;
  max: number;
  version_name: string;
  protocol: number;
  favicon?: string;
  players?: PlayerSample[];
  latency_ms: number;
}

export interface MotdError {
  kind: string;
  message: string;
}

/** 当前是否运行在 Tauri 环境（桌面/移动端） */
export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

/** 调用后端 query_motd 命令（仅 Tauri 环境） */
async function queryMotdTauri(query: MotdQuery): Promise<MotdResult> {
  return invoke<MotdResult>("query_motd", { query });
}

// ============== Web 端：mcsrvstat.us API ==============

interface McSrvStatPlayer {
  name: string;
  uuid: string;
}

interface McSrvStatJavaResponse {
  online: boolean;
  ip: string;
  port: number;
  hostname?: string;
  debug?: { ping?: boolean };
  motd?: {
    raw?: string[];
    clean?: string[];
    html?: string[];
  };
  players?: {
    online: number;
    max: number;
    list?: McSrvStatPlayer[];
  };
  version?: string;
  protocol?: number;
  icon?: string;
}

interface McSrvStatBedrockResponse {
  online: boolean;
  ip: string;
  port: number;
  hostname?: string;
  motd?: {
    raw?: string[];
    clean?: string[];
  };
  players?: {
    online: number;
    max: number;
  };
  version?: string;
  map?: string;
  gamemode?: string;
}

/** web 端：调用 mcsrvstat.us API */
async function queryMotdWeb(query: MotdQuery): Promise<MotdResult> {
  const start = performance.now();
  const { edition, host, port } = query;
  const hostWithPort = port ? `${host}:${port}` : host;

  let url: string;
  if (edition === "java") {
    url = `https://api.mcsrvstat.us/3/${encodeURIComponent(hostWithPort)}`;
  } else {
    url = `https://api.mcsrvstat.us/bedrock/3/${encodeURIComponent(hostWithPort)}`;
  }

  let resp: Response;
  try {
    resp = await fetch(url, { cache: "no-store" });
  } catch (e) {
    throw {
      kind: "unreachable",
      message: e instanceof Error ? e.message : String(e),
    } as MotdError;
  }

  if (resp.status === 404) {
    throw { kind: "timeout", message: "server not found" } as MotdError;
  }
  if (!resp.ok) {
    throw {
      kind: "unknown",
      message: `API error: ${resp.status}`,
    } as MotdError;
  }

  const data = (await resp.json()) as
    | McSrvStatJavaResponse
    | McSrvStatBedrockResponse;
  const latency_ms = Math.round(performance.now() - start);

  if (!data.online) {
    throw { kind: "unreachable", message: "server offline" } as MotdError;
  }

  if (edition === "java") {
    return parseJavaResponse(data as McSrvStatJavaResponse, latency_ms);
  }
  return parseBedrockResponse(data as McSrvStatBedrockResponse, latency_ms);
}

function parseJavaResponse(
  data: McSrvStatJavaResponse,
  latency_ms: number,
): MotdResult {
  // motd.clean 是已去除 § 颜色代码的纯文本行，重新拼接为带 § 的 legacy 形式
  // mcsrvstat 的 raw 数组保留 § 代码，更适合我们的解析器
  const motdLines = data.motd?.raw ?? data.motd?.clean ?? [];
  const description = motdLines.join("\n");

  return {
    edition: "java",
    description,
    online: data.players?.online ?? 0,
    max: data.players?.max ?? 0,
    version_name: data.version ?? "",
    protocol: data.protocol ?? 0,
    favicon: data.icon,
    players: data.players?.list?.map((p) => ({
      name: p.name,
      id: p.uuid,
    })),
    latency_ms,
  };
}

function parseBedrockResponse(
  data: McSrvStatBedrockResponse,
  latency_ms: number,
): MotdResult {
  const motdLines = data.motd?.raw ?? data.motd?.clean ?? [];
  const description = motdLines.join("\n");

  return {
    edition: "bedrock",
    description,
    online: data.players?.online ?? 0,
    max: data.players?.max ?? 0,
    version_name: data.version ?? "",
    protocol: 0,
    favicon: undefined,
    players: [],
    latency_ms,
  };
}

/** 统一入口：根据环境分流 */
export async function queryMotd(query: MotdQuery): Promise<MotdResult> {
  if (isTauri()) {
    return queryMotdTauri(query);
  }
  return queryMotdWeb(query);
}
