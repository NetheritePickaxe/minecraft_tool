// Tauri command 调用封装
// 注意：MOTD 查询依赖 Rust 后端发原始 TCP/UDP，仅在 Tauri 环境（桌面/移动端）可用

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

/** 调用后端 query_motd 命令 */
export async function queryMotd(query: MotdQuery): Promise<MotdResult> {
  return invoke<MotdResult>("query_motd", { query });
}
