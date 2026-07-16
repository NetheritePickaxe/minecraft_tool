// settings 模块 UI
// 纯 DaisyUI 组件：collapse / join / menu / table / divider / progress / btn / alert

import { t, onLocaleChange, setLocale, getLocale } from "../../lang";
import type { LocaleCode } from "../../lang";
import {
  applyTheme,
  getTheme,
  onThemeChange,
  THEMES,
  THEME_NAME_KEY,
  type Theme,
  getRadius,
  applyRadiusLevel,
  onRadiusChange,
  RADIUS_LEVELS,
  RADIUS_VALUE,
  type RadiusKey,
  type RadiusLevel,
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
  const isApp = isTauri();
  let version = "0.0.0";
  let updateState: UpdateState = { kind: "idle" };

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-3">
      <!-- 语言：collapse -->
      <div class="collapse collapse-arrow bg-base-100 rounded-2xl shadow-sm">
        <input type="checkbox" checked />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="languages" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.language.title"></span>
        </div>
        <div class="collapse-content">
          <div class="join w-full mt-2" id="set-locale-list"></div>
        </div>
      </div>

      <!-- 主题：collapse -->
      <div class="collapse collapse-arrow bg-base-100 rounded-2xl shadow-sm">
        <input type="checkbox" checked />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="sun-moon" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.theme.title"></span>
        </div>
        <div class="collapse-content">
          <!-- 主题选择：列表形式 -->
          <div class="flex flex-col gap-1 mt-2" id="set-theme-list"></div>
        </div>
      </div>

      <!-- 圆角定制：collapse（参考 DaisyUI --radius-box/field/selector） -->
      <div class="collapse collapse-arrow bg-base-100 rounded-2xl shadow-sm">
        <input type="checkbox" />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="rounded-box" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.radius.title"></span>
        </div>
        <div class="collapse-content">
          <!-- Box 圆角：参考 DaisyUI 官网 Radius 卡片风格 -->
          <div class="mt-3" data-radius-group="box">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm opacity-70" data-i18n="modules.settings.radius.box"></span>
              <span class="badge badge-sm badge-ghost" id="set-radius-box-val"></span>
            </div>
            <div class="grid grid-cols-5 gap-2" id="set-radius-box-list"></div>
          </div>
          <!-- Field 圆角 -->
          <div class="mt-3" data-radius-group="field">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm opacity-70" data-i18n="modules.settings.radius.field"></span>
              <span class="badge badge-sm badge-ghost" id="set-radius-field-val"></span>
            </div>
            <div class="grid grid-cols-5 gap-2" id="set-radius-field-list"></div>
          </div>
          <!-- Selector 圆角 -->
          <div class="mt-3" data-radius-group="selector">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm opacity-70" data-i18n="modules.settings.radius.selector"></span>
              <span class="badge badge-sm badge-ghost" id="set-radius-selector-val"></span>
            </div>
            <div class="grid grid-cols-5 gap-2" id="set-radius-selector-list"></div>
          </div>
        </div>
      </div>

      <!-- 链接：card + menu（Web 端不显示「在线 Web 版」） -->
      <div class="card bg-base-100 rounded-2xl shadow-sm">
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
            ${
              isApp
                ? `<li>
              <a data-link="${WEB_URL}" class="gap-2">
                <i data-lucide="globe" class="w-4 h-4"></i>
                <span data-i18n="modules.settings.links.web"></span>
              </a>
            </li>`
                : ""
            }
          </ul>
        </div>
      </div>

      <!-- 关于：所有平台都显示（版本/平台/作者） -->
      <div class="card bg-base-100 rounded-2xl shadow-sm">
        <div class="card-body gap-3">
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
                  <td class="text-right font-mono" id="set-platform">Web</td>
                </tr>
                <tr>
                  <td class="opacity-70" data-i18n="modules.settings.about.author"></td>
                  <td class="text-right font-mono">NetheritePickaxe</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 检查更新：仅 Tauri 应用端显示，按钮用 card 样式 -->
      ${
        isApp
          ? `<div class="card bg-base-100 rounded-2xl shadow-sm">
        <div class="card-body gap-3">
          <h3 class="card-title text-base gap-2">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            <span data-i18n="modules.settings.update.title"></span>
          </h3>
          <div id="set-update-area" class="space-y-3">
            <div id="set-check-card" class="card bg-primary/10 rounded-2xl cursor-pointer hover:bg-primary/15 transition-colors" role="button" tabindex="0">
              <div class="card-body py-3 px-4 flex-row items-center gap-3">
                <i data-lucide="refresh-cw" class="w-5 h-5 text-primary"></i>
                <span class="flex-1 text-sm font-medium" data-i18n="modules.settings.update.check"></span>
              </div>
            </div>
            <div id="set-update-status" class="text-sm"></div>
            <progress id="set-progress" class="progress progress-primary w-full hidden" value="0" max="100"></progress>
            <div id="set-install-card" class="card bg-success/10 rounded-2xl cursor-pointer hover:bg-success/15 transition-colors hidden" role="button" tabindex="0">
              <div class="card-body py-3 px-4 flex-row items-center gap-3">
                <i data-lucide="download" class="w-5 h-5 text-success"></i>
                <span class="flex-1 text-sm font-medium" data-i18n="modules.settings.update.install"></span>
              </div>
            </div>
          </div>
        </div>
      </div>`
          : ""
      }
    </div>
  `;

  const localeList = qs<HTMLElement>(container, "#set-locale-list");
  const themeList = qs<HTMLElement>(container, "#set-theme-list");
  const radiusLists: Record<RadiusKey, HTMLElement> = {
    box: qs<HTMLElement>(container, "#set-radius-box-list"),
    field: qs<HTMLElement>(container, "#set-radius-field-list"),
    selector: qs<HTMLElement>(container, "#set-radius-selector-list"),
  };
  const versionEl = container.querySelector<HTMLElement>("#set-version");
  const platformEl = container.querySelector<HTMLElement>("#set-platform");
  const checkBtn = container.querySelector<HTMLElement>("#set-check-card");
  const statusBox = container.querySelector<HTMLElement>("#set-update-status");
  const progressBar =
    container.querySelector<HTMLProgressElement>("#set-progress");
  const installBtn = container.querySelector<HTMLElement>("#set-install-card");

  function refresh(): void {
    container.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    renderLocaleList();
    renderThemeButtons();
    renderRadius();
    if (platformEl) platformEl.textContent = platformLabel(platform);
    if (versionEl) versionEl.textContent = version;
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
        `<button class="btn btn-sm join-item flex-1 ${o.code === current ? "btn-active btn-primary" : ""}" data-locale="${o.code}">${o.label}</button>`,
    ).join("");
  }

  function renderThemeButtons(): void {
    const current = getTheme();
    themeList.innerHTML = THEMES.map(
      (name) => {
        const checked = name === current;
        return `
          <label class="flex items-center gap-3 p-2 rounded-box hover:bg-base-200 cursor-pointer transition-colors" data-theme-set="${name}">
            <input type="radio" name="theme-radio" value="${name}" class="radio radio-primary shrink-0" ${checked ? "checked" : ""} />
            <span class="flex-1 text-sm">${t(THEME_NAME_KEY[name])}</span>
            <span class="w-4 h-4 rounded-full bg-primary" data-theme="${name}"></span>
          </label>`;
      },
    ).join("");
  }

  function renderRadius(): void {
    const settings = getRadius();
    (["box", "field", "selector"] as RadiusKey[]).forEach((key) => {
      const current = settings[key];
      const valEl = container.querySelector<HTMLElement>(`#set-radius-${key}-val`);
      if (valEl) valEl.textContent = t(`modules.settings.radius.level.${current}`);
      renderRadiusOptions(key, current);
    });
  }

  function renderRadiusOptions(key: RadiusKey, current: RadiusLevel): void {
    const list = radiusLists[key];
    list.innerHTML = RADIUS_LEVELS.map(
      (level) => {
        const checked = level === current;
        const value = RADIUS_VALUE[level];
        return `
          <label class="cursor-pointer">
            <input type="radio" name="radius-${key}" value="${level}" class="peer sr-only radius-opt" data-radius-key="${key}" data-radius-level="${level}" ${checked ? "checked" : ""} />
            <div class="bg-base-200 rounded-box p-2 flex items-center justify-center aspect-square transition-all peer-checked:ring-2 peer-checked:ring-primary peer-checked:bg-primary/5">
              <div class="w-8 h-8 bg-base-300 border-2 border-base-300 transition-all peer-checked:border-primary peer-checked:bg-base-100" style="border-top-right-radius: ${value};"></div>
            </div>
          </label>`;
      },
    ).join("");
  }

  function renderUpdateStatus(): void {
    // Web 端没有更新区，直接跳过
    if (!isApp || !statusBox || !checkBtn) return;
    const s = updateState;
    installBtn?.classList.add("hidden");
    progressBar?.classList.add("hidden");
    const enableCheck = (on: boolean): void => {
      checkBtn.classList.toggle("pointer-events-none", !on);
      checkBtn.classList.toggle("opacity-50", !on);
    };

    switch (s.kind) {
      case "idle":
        statusBox.innerHTML = "";
        enableCheck(true);
        break;
      case "checking":
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.checking"))}</span>`;
        enableCheck(false);
        break;
      case "up-to-date":
        statusBox.innerHTML = `<span class="flex items-center gap-2 text-success"><i data-lucide="check-circle" class="w-4 h-4"></i>${escapeHtml(t("modules.settings.update.up-to-date"))}</span>`;
        enableCheck(true);
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
        enableCheck(true);
        installBtn?.classList.remove("hidden");
        break;
      }
      case "downloading": {
        const pct = s.total > 0 ? Math.min(100, Math.round((s.progress / s.total) * 100)) : 0;
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.downloading", { percent: String(pct) }))}</span>`;
        progressBar?.classList.remove("hidden");
        if (progressBar) progressBar.value = pct;
        enableCheck(false);
        break;
      }
      case "installing":
        statusBox.innerHTML = `<span class="flex items-center gap-2"><span class="loading loading-spinner loading-xs"></span>${escapeHtml(t("modules.settings.update.installing"))}</span>`;
        enableCheck(false);
        break;
      case "error":
        statusBox.innerHTML = `<span class="flex items-center gap-2 text-error"><i data-lucide="alert-circle" class="w-4 h-4"></i>${escapeHtml(t("modules.settings.update.error", { message: s.message }))}</span>`;
        enableCheck(true);
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
    if (versionEl) versionEl.textContent = version;
  }

  // ============== 事件处理 ==============

  localeList.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-locale]",
    );
    if (!btn) return;
    setLocale(btn.dataset.locale as LocaleCode);
  });

  // 主题选择（动态渲染，事件委托）
  themeList.addEventListener("change", (e) => {
    const radio = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[name=\"theme-radio\"]",
    );
    if (!radio) return;
    applyTheme(radio.value as Theme);
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

  checkBtn?.addEventListener("click", () => void doCheckUpdate());
  installBtn?.addEventListener("click", () => void doInstall());

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

  const offTheme = onThemeChange(() => {
    renderThemeButtons();
    container.dispatchEvent(
      new CustomEvent("settings:icons-stale", { bubbles: true }),
    );
  });
  const offLocale = onLocaleChange(() => refresh());

  // 圆角选项 change（事件委托）
  const handleRadiusInputChange = (e: Event): void => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>(
      ".radius-opt",
    );
    if (!input || !input.checked) return;
    const key = input.dataset.radiusKey as RadiusKey;
    const level = input.dataset.radiusLevel as RadiusLevel;
    if (!key || !level || !RADIUS_LEVELS.includes(level)) return;
    applyRadiusLevel(key, level);
  };
  container.addEventListener("change", handleRadiusInputChange);
  // 圆角变化时刷新激活态（预览元素靠 CSS 变量自动生效）
  const offRadius = onRadiusChange(() => renderRadius());

  void loadVersion();
  refresh();

  return {
    refresh,
    destroy() {
      offTheme();
      offLocale();
      offRadius();
      container.removeEventListener("change", handleRadiusInputChange);
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
