// settings 模块 UI
// 使用 DaisyUI 组件：card / btn-group / join / collapse / table / divider / progress / alert
// 所有可见文本走 t()，语言切换时通过 refresh() 更新

import { t, onLocaleChange, setLocale, getLocale } from "../../lang";
import type { LocaleCode } from "../../lang";
import {
  applyTheme,
  getTheme,
  onThemeChange,
} from "../../core/theme";
import {
  detectPlatform,
  getAppVersion,
  checkDesktopUpdate,
  downloadAndInstallDesktopUpdate,
  checkAndroidUpdate,
  openAndroidDownload,
  openExternalUrl,
  isTauri,
  type DesktopUpdateInfo,
  type AndroidUpdateInfo,
  type Platform,
  type DownloadEvent,
} from "./commands";

const REPO_URL = "https://github.com/NetheritePickaxe/minecraft_tool";
const ISSUES_URL = `${REPO_URL}/issues`;
const WEB_URL = "https://netheritepickaxe.github.io/minecraft_tool/";

const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string }> = [
  { code: "zh_cn", label: "简体中文" },
  { code: "en_us", label: "English" },
];

export interface SettingsUi {
  refresh: () => void;
  destroy: () => void;
}

type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; info: DesktopUpdateInfo | AndroidUpdateInfo }
  | { kind: "downloading"; progress: number; total: number }
  | { kind: "installing" }
  | { kind: "error"; message: string };

export function createUi(container: HTMLElement): SettingsUi {
  const platform: Platform = detectPlatform();

  let version = "0.0.0";
  let updateState: UpdateState = { kind: "idle" };

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-4">
      <!-- 语言：DaisyUI collapse -->
      <div class="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="checkbox" checked />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="languages" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.language.title"></span>
        </div>
        <div class="collapse-content">
          <div class="btn-group join w-full mt-2" id="set-locale-list"></div>
        </div>
      </div>

      <!-- 主题：DaisyUI collapse -->
      <div class="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="checkbox" checked />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="sun-moon" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.theme.title"></span>
        </div>
        <div class="collapse-content">
          <div class="btn-group join w-full mt-2" id="set-theme-list">
            <button class="btn btn-sm join-item flex-1" data-theme-set="light" data-i18n="modules.settings.theme.light"></button>
            <button class="btn btn-sm join-item flex-1" data-theme-set="dark" data-i18n="modules.settings.theme.dark"></button>
          </div>
        </div>
      </div>

      <!-- 链接：DaisyUI menu -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-0">
          <div class="card-title text-base gap-2 px-4 pt-4">
            <i data-lucide="external-link" class="w-4 h-4"></i>
            <span data-i18n="modules.settings.links.title"></span>
          </div>
          <ul class="menu menu-sm w-full p-2 mt-2">
            <li>
              <a data-link="${REPO_URL}" class="gap-2">
                <i data-lucide="star" class="w-4 h-4"></i>
                <span data-i18n="modules.settings.links.repo"></span>
              </a>
            </li>
            <li>
              <a data-link="${ISSUES_URL}" class="gap-2">
                <i data-lucide="message-circle" class="w-4 h-4"></i>
                <span data-i18n="modules.settings.links.issues"></span>
              </a>
            </li>
            <li>
              <a data-link="${WEB_URL}" class="gap-2">
                <i data-lucide="globe" class="w-4 h-4"></i>
                <span data-i18n="modules.settings.links.web"></span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- 关于 + 更新：DaisyUI card + table + progress -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body gap-4">
          <h3 class="card-title text-base gap-2">
            <i data-lucide="info" class="w-4 h-4"></i>
            <span data-i18n="modules.settings.about.title"></span>
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                <tr>
                  <td class="opacity-70" data-i18n="modules.settings.about.version"></td>
                  <td class="text-right font-mono" id="set-version">0.0.0</td>
                </tr>
                <tr>
                  <td class="opacity-70" data-i18n="modules.settings.about.platform"></td>
                  <td class="text-right font-mono" id="set-platform"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider my-0"></div>

          <div id="set-update-area" class="space-y-3">
            <button id="set-check-btn" class="btn btn-primary btn-sm w-full gap-2">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
              <span data-i18n="modules.settings.update.check"></span>
            </button>
            <div id="set-update-status" class="text-sm"></div>
            <progress id="set-progress" class="progress progress-primary w-full hidden" value="0" max="100"></progress>
            <button id="set-install-btn" class="btn btn-success btn-sm w-full gap-2 hidden">
              <i data-lucide="download" class="w-4 h-4"></i>
              <span data-i18n="modules.settings.update.install"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const localeList = qs<HTMLElement>(container, "#set-locale-list");
  const versionEl = qs<HTMLElement>(container, "#set-version");
  const platformEl = qs<HTMLElement>(container, "#set-platform");
  const checkBtn = qs<HTMLButtonElement>(container, "#set-check-btn");
  const statusBox = qs<HTMLElement>(container, "#set-update-status");
  const progressBar = qs<HTMLProgressElement>(container, "#set-progress");
  const installBtn = qs<HTMLButtonElement>(container, "#set-install-btn");

  function refresh(): void {
    container.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    renderLocaleList();
    renderThemeButtons();
    platformEl.textContent = platformLabel(platform);
    versionEl.textContent = version;
    renderUpdateStatus();
  }

  function platformLabel(p: Platform): string {
    if (p === "windows") return "Windows";
    if (p === "android") return "Android";
    return "Web";
  }

  function renderLocaleList(): void {
    const current = getLocale();
    localeList.innerHTML = LOCALE_OPTIONS.map(
      (o) =>
        `<button class="btn btn-sm join-item flex-1 ${o.code === current ? "btn-active" : "btn-ghost"}" data-locale="${o.code}">${o.label}</button>`,
    ).join("");
  }

  function renderThemeButtons(): void {
    const current = getTheme();
    container
      .querySelectorAll<HTMLButtonElement>("[data-theme-set]")
      .forEach((btn) => {
        const theme = btn.dataset.themeSet as "light" | "dark";
        btn.classList.toggle("btn-active", theme === current);
        btn.classList.toggle("btn-ghost", theme !== current);
      });
  }

  function renderUpdateStatus(): void {
    const s = updateState;
    installBtn.classList.add("hidden");
    progressBar.classList.add("hidden");

    switch (s.kind) {
      case "idle":
        statusBox.innerHTML = "";
        checkBtn.disabled = false;
        break;
      case "checking":
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.checking"))}</span>`;
        checkBtn.disabled = true;
        break;
      case "up-to-date":
        statusBox.innerHTML = `<span class="flex items-center gap-2 text-success"><i data-lucide="check-circle" class="w-4 h-4"></i>${escapeHtml(t("modules.settings.update.up-to-date"))}</span>`;
        checkBtn.disabled = false;
        break;
      case "available": {
        const info = s.info;
        const ver = info.version;
        const notes =
          "notes" in info
            ? (info as AndroidUpdateInfo).notes
            : (info as DesktopUpdateInfo).body ?? "";
        const date =
          "date" in info
            ? (info as DesktopUpdateInfo).date
            : "pubDate" in info
              ? (info as AndroidUpdateInfo).pubDate
              : "";
        statusBox.innerHTML = `
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-info">
              <i data-lucide="arrow-up-circle" class="w-4 h-4"></i>
              <span>${escapeHtml(t("modules.settings.update.available", { version: ver }))}</span>
            </div>
            ${date ? `<div class="text-xs opacity-50">${escapeHtml(date)}</div>` : ""}
            ${notes ? `<div class="text-xs whitespace-pre-line opacity-70 mt-1 max-h-32 overflow-y-auto">${escapeHtml(notes)}</div>` : ""}
            ${platform === "android" ? `<div class="text-xs opacity-60 mt-1">${escapeHtml(t("modules.settings.update.android-hint"))}</div>` : ""}
          </div>
        `;
        checkBtn.disabled = false;
        installBtn.classList.remove("hidden");
        break;
      }
      case "downloading": {
        const pct = s.total > 0 ? Math.min(100, Math.round((s.progress / s.total) * 100)) : 0;
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.downloading", { percent: String(pct) }))}</span>`;
        progressBar.classList.remove("hidden");
        progressBar.value = pct;
        checkBtn.disabled = true;
        break;
      }
      case "installing":
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.installing"))}</span>`;
        checkBtn.disabled = true;
        break;
      case "error":
        statusBox.innerHTML = `<span class="flex items-center gap-2 text-error"><i data-lucide="alert-circle" class="w-4 h-4"></i>${escapeHtml(t("modules.settings.update.error", { message: s.message }))}</span>`;
        checkBtn.disabled = false;
        break;
    }
    container.dispatchEvent(
      new CustomEvent("settings:icons-stale", { bubbles: true }),
    );
  }

  async function loadVersion(): Promise<void> {
    if (isTauri()) {
      try {
        version = await getAppVersion();
      } catch {
        version = "0.0.0";
      }
    }
    versionEl.textContent = version;
  }

  // ============== 事件处理 ==============

  localeList.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-locale]",
    );
    if (!btn) return;
    setLocale(btn.dataset.locale as LocaleCode);
  });

  container
    .querySelectorAll<HTMLButtonElement>("[data-theme-set]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        applyTheme(btn.dataset.themeSet as "light" | "dark");
      });
    });

  container.addEventListener("click", async (e) => {
    const linkBtn = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      "[data-link]",
    );
    if (!linkBtn) return;
    const url = linkBtn.dataset.link!;
    if (isTauri()) {
      try {
        await openExternalUrl(url);
      } catch (err) {
        console.error("open url failed:", err);
      }
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  });

  checkBtn.addEventListener("click", () => void doCheckUpdate());
  installBtn.addEventListener("click", () => void doInstall());

  async function doCheckUpdate(): Promise<void> {
    if (!isTauri()) {
      updateState = {
        kind: "error",
        message: t("modules.settings.update.unavailable-web"),
      };
      renderUpdateStatus();
      return;
    }

    updateState = { kind: "checking" };
    renderUpdateStatus();

    try {
      if (platform === "windows") {
        const info = await checkDesktopUpdate();
        updateState = info.available
          ? { kind: "available", info }
          : { kind: "up-to-date" };
      } else if (platform === "android") {
        const info = await checkAndroidUpdate();
        updateState = info.available
          ? { kind: "available", info }
          : { kind: "up-to-date" };
      } else {
        updateState = {
          kind: "error",
          message: t("modules.settings.update.unavailable-web"),
        };
      }
    } catch (err) {
      updateState = {
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
    renderUpdateStatus();
  }

  async function doInstall(): Promise<void> {
    if (updateState.kind !== "available") return;
    const info = updateState.info;

    if (platform === "windows") {
      updateState = { kind: "downloading", progress: 0, total: 0 };
      renderUpdateStatus();
      try {
        let total = 0;
        let downloaded = 0;
        await downloadAndInstallDesktopUpdate((event: DownloadEvent) => {
          switch (event.event) {
            case "Started":
              total = event.data.contentLength ?? 0;
              downloaded = 0;
              updateState = { kind: "downloading", progress: 0, total };
              renderUpdateStatus();
              break;
            case "Progress":
              downloaded += event.data.chunkLength;
              updateState = {
                kind: "downloading",
                progress: downloaded,
                total,
              };
              renderUpdateStatus();
              break;
            case "Finished":
              updateState = { kind: "installing" };
              renderUpdateStatus();
              break;
          }
        });
        updateState = { kind: "installing" };
        renderUpdateStatus();
      } catch (err) {
        updateState = {
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        renderUpdateStatus();
      }
    } else if (platform === "android") {
      const apkUrl = (info as AndroidUpdateInfo).apkUrl;
      try {
        await openAndroidDownload(apkUrl);
      } catch (err) {
        updateState = {
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        renderUpdateStatus();
      }
    }
  }

  const offTheme = onThemeChange(() => renderThemeButtons());
  const offLocale = onLocaleChange(() => refresh());

  void loadVersion();
  refresh();

  return {
    refresh,
    destroy() {
      offTheme();
      offLocale();
    },
  };
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
