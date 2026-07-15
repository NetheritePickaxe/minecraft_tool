// settings 模块的更新检查 / 下载安装封装
// - 桌面端 (Windows)：用 @tauri-apps/plugin-updater 走完整流程（自动下载 + 静默安装）
// - Android：用 fetch latest.json 检查版本，shell.open 打开 APK 下载链接（浏览器接管）
// - Web：不可用
//
// tauri-plugin-updater 仅在桌面端 Rust 注册（见 src-tauri/src/lib.rs 的 cfg(desktop)），
// 因此 Android 上 import 不会失败，但调用 check() 会抛 "plugin not found"。
// 这里通过 detectPlatform() 在调用前分流。

import { check } from "@tauri-apps/plugin-updater";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { getVersion } from "@tauri-apps/api/app";

const REPO = "NetheritePickaxe/minecraft_tool";
const MANIFEST_URL = `https://github.com/${REPO}/releases/latest/download/latest.json`;

export type Platform = "windows" | "android" | "web";

/** 检测当前运行平台 */
export function detectPlatform(): Platform {
  if (!("__TAURI_INTERNALS__" in window)) return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  // 桌面端统称 windows（目前只构建 Windows 桌面端）
  return "windows";
}

// ============== 通用工具 ==============

/** 当前应用版本号 */
export async function getAppVersion(): Promise<string> {
  return await getVersion();
}

/** 比较语义版本号，返回 -1/0/1 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const an = pa[i] ?? 0;
    const bn = pb[i] ?? 0;
    if (an < bn) return -1;
    if (an > bn) return 1;
  }
  return 0;
}

// ============== 桌面端更新（plugin-updater） ==============

export type DownloadEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

export interface DesktopUpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
}

/** 桌面端：检查更新 */
export async function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  const update = await check();
  if (!update) {
    // check() 返回 null 表示无更新
    const currentVersion = await getAppVersion();
    return {
      available: false,
      currentVersion,
      version: currentVersion,
    };
  }
  return {
    available: true,
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
  };
}

/**
 * 桌面端：下载并安装更新。
 * 安装完成后调用方应调用 relaunch() 重启应用。
 */
export async function downloadAndInstallDesktopUpdate(
  onEvent?: (event: DownloadEvent) => void,
): Promise<void> {
  const update = await check();
  if (!update) throw new Error("no update available");
  await update.downloadAndInstall((event) => {
    onEvent?.(event as DownloadEvent);
  });
}

// ============== Android 更新（自建） ==============

interface AndroidManifest {
  version: string;
  notes: string;
  pub_date: string;
  android: {
    "arm64-v8a"?: string;
    "armeabi-v7a"?: string;
    "x86_64"?: string;
  };
}

export interface AndroidUpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  notes: string;
  apkUrl: string;
  pubDate: string;
}

/** Android：根据 navigator.userAgent 推断当前 ABI */
function detectAbi(): "arm64-v8a" | "armeabi-v7a" | "x86_64" | null {
  // Android WebView UA 不直接暴露 ABI，但 Tauri 应用进程的 navigator.userAgent 通常包含 build info
  // 兜底策略：依次匹配关键字
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("aarch64") || ua.includes("arm64")) return "arm64-v8a";
  if (ua.includes("x86_64") || ua.includes("x64")) return "x86_64";
  if (ua.includes("armv7") || ua.includes("armv7l") || ua.includes("arm")) {
    return "armeabi-v7a";
  }
  // 多数真机为 arm64，作为兜底
  return "arm64-v8a";
}

/** Android：检查更新 */
export async function checkAndroidUpdate(): Promise<AndroidUpdateInfo> {
  const resp = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`fetch manifest failed: ${resp.status}`);
  }
  const manifest: AndroidManifest = await resp.json();

  const currentVersion = await getAppVersion();
  const latestVersion = manifest.version.replace(/^v/, "");

  const abi = detectAbi();
  if (!abi) throw new Error("cannot detect android abi");
  const apkUrl = manifest.android[abi];
  if (!apkUrl) throw new Error(`no apk for abi ${abi}`);

  return {
    available: compareVersions(currentVersion, latestVersion) < 0,
    currentVersion,
    version: latestVersion,
    notes: manifest.notes,
    apkUrl,
    pubDate: manifest.pub_date,
  };
}

/** Android：用浏览器打开 APK 下载链接（用户手动下载安装） */
export async function openAndroidDownload(apkUrl: string): Promise<void> {
  await shellOpen(apkUrl);
}

/** 通用：在系统浏览器中打开任意 URL（用于链接区） */
export async function openExternalUrl(url: string): Promise<void> {
  await shellOpen(url);
}

/** 是否在 Tauri 环境中 */
export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
