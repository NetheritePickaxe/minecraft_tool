// settings 模块 UI
// 纯 DaisyUI 组件：collapse / join / menu / table / btn / radio / color picker

import { t, onLocaleChange, setLocale, getLocale } from "../../lang";
import type { LocaleCode } from "../../lang";
import {
  getThemeMode,
  setThemeMode,
  getDefaultLightTheme,
  setDefaultLightTheme,
  getDefaultDarkTheme,
  setDefaultDarkTheme,
  onThemeChange,
  LIGHT_THEMES,
  DARK_THEMES,
  isLightTheme,
  THEME_NAME_KEY,
  getCustomTheme,
  setCustomTheme,
  getTheme,
  readThemeColors,
  DEFAULT_CUSTOM,
  type Theme,
  type ThemeMode,
  type CustomThemeConfig,
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
import {
  getNavStyle,
  setNavStyle,
  onNavStyleChange,
  type NavStyle,
} from "../../core/layout";

const REPO_URL = "https://github.com/NetheritePickaxe/minecraft_tool";
const ISSUES_URL = `${REPO_URL}/issues`;
const WEB_URL = "https://netheritepickaxe.github.io/minecraft_tool/";

const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string }> = [
  { code: "zh_cn", label: "简体中文" },
  { code: "en_us", label: "English" },
];

const THEME_MODES: Array<{ mode: ThemeMode; key: string }> = [
  { mode: "light", key: "modules.settings.theme.mode.light" },
  { mode: "dark", key: "modules.settings.theme.mode.dark" },
  { mode: "auto", key: "modules.settings.theme.mode.auto" },
];

const NAV_STYLES: Array<{ style: NavStyle; key: string }> = [
  { style: "normal", key: "modules.settings.nav.normal" },
  { style: "floating", key: "modules.settings.nav.floating" },
];

const CUSTOM_COLORS: Array<{
  key: keyof Omit<CustomThemeConfig, "mode">;
  label: string;
}> = [
  { key: "primary", label: "modules.settings.theme.custom.primary" },
  { key: "secondary", label: "modules.settings.theme.custom.secondary" },
  { key: "accent", label: "modules.settings.theme.custom.accent" },
  { key: "neutral", label: "modules.settings.theme.custom.neutral" },
  { key: "base100", label: "modules.settings.theme.custom.base" },
  { key: "baseContent", label: "modules.settings.theme.custom.base-content" },
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
  let lightSlotExpanded = false;
  let darkSlotExpanded = false;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-3">
      <!-- 语言：collapse + radio 列表 -->
      <div class="collapse collapse-arrow bg-base-100 rounded-2xl shadow-sm">
        <input type="checkbox" checked />
        <div class="collapse-title font-medium flex items-center gap-2">
          <i data-lucide="languages" class="w-4 h-4"></i>
          <span data-i18n="modules.settings.language.title"></span>
        </div>
        <div class="collapse-content">
          <div class="flex flex-col gap-0 mt-2" id="set-locale-list"></div>
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
          <!-- 主题模式选择 -->
          <div class="mt-3">
            <div class="text-sm opacity-70 mb-2" data-i18n="modules.settings.theme.mode"></div>
            <div class="join w-full" id="set-theme-mode"></div>
          </div>

          <!-- 主题选择区：根据模式动态渲染（浅色网格 / 深色网格 / 双槽位） -->
          <div class="mt-4" id="set-theme-picker"></div>

          <!-- 自定义主题：单独分类 -->
          <div class="mt-4 pt-4 border-t border-base-200">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-medium" data-i18n="modules.settings.theme.custom-title"></div>
              <button id="custom-from-current" class="btn btn-xs btn-ghost gap-1">
                <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                <span class="text-xs" data-i18n="modules.settings.theme.custom.from-current"></span>
              </button>
            </div>
            <div id="set-custom-theme" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm flex-1" data-i18n="modules.settings.theme.custom.mode"></span>
                <select id="custom-mode" class="select select-sm select-bordered">
                  <option value="light" data-i18n="modules.settings.theme.mode.light"></option>
                  <option value="dark" data-i18n="modules.settings.theme.mode.dark"></option>
                </select>
              </div>
              <div id="custom-colors" class="space-y-2"></div>
              <!-- 实时预览 -->
              <div class="p-3 bg-base-200/60 rounded-2xl">
                <div class="text-xs opacity-60 mb-2" data-i18n="modules.settings.theme.custom.preview"></div>
                <div class="grid grid-cols-4 gap-2">
                  <div class="aspect-square rounded-xl border border-base-content/10" id="preview-primary"></div>
                  <div class="aspect-square rounded-xl border border-base-content/10" id="preview-secondary"></div>
                  <div class="aspect-square rounded-xl border border-base-content/10" id="preview-accent"></div>
                  <div class="aspect-square rounded-xl border border-base-content/10" id="preview-neutral"></div>
                </div>
              </div>
              <button id="custom-save" class="btn btn-sm btn-primary w-full" data-i18n="modules.settings.theme.custom.save"></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底边栏样式：card + join -->
      <div class="card bg-base-100 rounded-2xl shadow-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-3">
            <i data-lucide="layout-grid" class="w-4 h-4"></i>
            <span class="font-medium" data-i18n="modules.settings.nav.title"></span>
          </div>
          <div class="join w-full" id="set-nav-style"></div>
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

      <!-- 关于：所有平台都显示（版本/平台/作者/更新） -->
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
          ${
            isApp
              ? `<div id="set-update-area" class="space-y-3 mt-2 pt-3 border-t border-base-200">
              <button id="set-check-card" class="btn btn-primary w-full gap-2">
                <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                <span data-i18n="modules.settings.update.check"></span>
              </button>
              <div id="set-update-status" class="text-sm"></div>
              <progress id="set-progress" class="progress progress-primary w-full hidden" value="0" max="100"></progress>
              <button id="set-install-card" class="btn btn-success w-full gap-2 hidden">
                <i data-lucide="download" class="w-5 h-5"></i>
                <span data-i18n="modules.settings.update.install"></span>
              </button>
            </div>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  const localeList = qs<HTMLElement>(container, "#set-locale-list");
  const themeModeBox = qs<HTMLElement>(container, "#set-theme-mode");
  const themePickerBox = qs<HTMLElement>(container, "#set-theme-picker");
  const customColorsBox = qs<HTMLElement>(container, "#custom-colors");
  const customModeSelect = qs<HTMLSelectElement>(container, "#custom-mode");
  const customSaveBtn = qs<HTMLButtonElement>(container, "#custom-save");
  const navStyleBox = qs<HTMLElement>(container, "#set-nav-style");
  const customFromCurrentBtn = qs<HTMLButtonElement>(container, "#custom-from-current");
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
    renderThemeMode();
    renderThemePicker();
    renderCustomTheme();
    renderNavStyle();
    if (platformEl) platformEl.textContent = platformLabel(platform);
    if (versionEl) versionEl.textContent = version;
    renderUpdateStatus();
  }

  function platformLabel(p: Platform): string {
    if (p === "windows") return "Windows";
    if (p === "android") return "Android";
    return "Web";
  }

  // ============== 语言列表 ==============

  function renderLocaleList(): void {
    const current = getLocale();
    localeList.innerHTML = LOCALE_OPTIONS.map(
      (o) => `
        <label class="label cursor-pointer justify-start gap-3 py-2" data-locale-set="${o.code}">
          <input type="radio" name="locale-radio" value="${o.code}" class="radio radio-primary radio-sm" ${o.code === current ? "checked" : ""} />
          <span class="label-text">${o.label}</span>
        </label>`,
    ).join("");
  }

  // ============== 主题模式 ==============

  function renderThemeMode(): void {
    const current = getThemeMode();
    themeModeBox.innerHTML = THEME_MODES.map(
      (m) =>
        `<input class="join-item btn btn-sm flex-1" type="radio" name="theme-mode" value="${m.mode}" aria-label="${t(m.key)}" ${m.mode === current ? "checked" : ""} />`,
    ).join("");
    // 更新按钮文字
    themeModeBox.querySelectorAll<HTMLInputElement>("input[name='theme-mode']").forEach((input) => {
      const mode = input.value as ThemeMode;
      const opt = THEME_MODES.find((m) => m.mode === mode);
      if (opt) input.setAttribute("aria-label", t(opt.key));
    });
  }

  // ============== 底边栏样式 ==============

  function renderNavStyle(): void {
    const current = getNavStyle();
    navStyleBox.innerHTML = NAV_STYLES.map(
      (s) =>
        `<input class="join-item btn btn-sm flex-1" type="radio" name="nav-style" value="${s.style}" aria-label="${t(s.key)}" ${s.style === current ? "checked" : ""} />`,
    ).join("");
    navStyleBox.querySelectorAll<HTMLInputElement>("input[name='nav-style']").forEach((input) => {
      const style = input.value as NavStyle;
      const opt = NAV_STYLES.find((s) => s.style === style);
      if (opt) input.setAttribute("aria-label", t(opt.key));
    });
  }

  // ============== 主题选择区 ==============

  function themeDisplayName(name: Theme): string {
    if (name === "custom") return t("modules.settings.theme.name.custom");
    return t(THEME_NAME_KEY[name as Exclude<Theme, "custom">]);
  }

  /** 槽位缩略图：4 个小圆点展示主题色 */
  function renderSlotSwatch(theme: Theme): string {
    if (theme === "custom") {
      const config = getCustomTheme();
      if (config) {
        return `
          <span class="flex gap-0.5">
            <span class="w-3 h-3 rounded-full border border-base-content/10" style="background:${config.primary}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/10" style="background:${config.secondary}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/10" style="background:${config.accent}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/10" style="background:${config.neutral}"></span>
          </span>`;
      }
    }
    return `
      <span class="flex gap-0.5" data-theme="${theme}">
        <span class="w-3 h-3 rounded-full bg-primary border border-base-content/10"></span>
        <span class="w-3 h-3 rounded-full bg-secondary border border-base-content/10"></span>
        <span class="w-3 h-3 rounded-full bg-accent border border-base-content/10"></span>
        <span class="w-3 h-3 rounded-full bg-neutral border border-base-content/10"></span>
      </span>`;
  }

  /** 根据当前模式渲染主题选择区 */
  function renderThemePicker(): void {
    const mode = getThemeMode();
    const currentLight = getDefaultLightTheme();
    const currentDark = getDefaultDarkTheme();

    let html = "";
    if (mode === "light") {
      html = `
        <div class="text-sm font-medium mb-2" data-i18n="modules.settings.theme.light-title"></div>
        <div class="grid grid-cols-3 gap-2">
          ${LIGHT_THEMES.map((name) =>
            renderThemeCard(name, name === currentLight, "light"),
          ).join("")}
        </div>`;
    } else if (mode === "dark") {
      html = `
        <div class="text-sm font-medium mb-2" data-i18n="modules.settings.theme.dark-title"></div>
        <div class="grid grid-cols-3 gap-2">
          ${DARK_THEMES.map((name) =>
            renderThemeCard(name, name === currentDark, "dark"),
          ).join("")}
        </div>`;
    } else {
      // auto：两个槽位，点击展开对应网格
      html = `
        <div class="collapse collapse-arrow bg-base-200 rounded-2xl mb-2">
          <input type="checkbox" ${lightSlotExpanded ? "checked" : ""} data-slot-toggle="light" />
          <div class="collapse-title font-medium flex items-center gap-2 min-h-0 py-3">
            <span class="text-sm" data-i18n="modules.settings.theme.light-title"></span>
            <span class="ml-auto flex items-center gap-2 mr-1">
              ${renderSlotSwatch(currentLight)}
              <span class="text-xs opacity-60">${escapeHtml(themeDisplayName(currentLight))}</span>
            </span>
          </div>
          <div class="collapse-content">
            <div class="grid grid-cols-3 gap-2 mt-2">
              ${LIGHT_THEMES.map((name) =>
                renderThemeCard(name, name === currentLight, "light"),
              ).join("")}
            </div>
          </div>
        </div>
        <div class="collapse collapse-arrow bg-base-200 rounded-2xl">
          <input type="checkbox" ${darkSlotExpanded ? "checked" : ""} data-slot-toggle="dark" />
          <div class="collapse-title font-medium flex items-center gap-2 min-h-0 py-3">
            <span class="text-sm" data-i18n="modules.settings.theme.dark-title"></span>
            <span class="ml-auto flex items-center gap-2 mr-1">
              ${renderSlotSwatch(currentDark)}
              <span class="text-xs opacity-60">${escapeHtml(themeDisplayName(currentDark))}</span>
            </span>
          </div>
          <div class="collapse-content">
            <div class="grid grid-cols-3 gap-2 mt-2">
              ${DARK_THEMES.map((name) =>
                renderThemeCard(name, name === currentDark, "dark"),
              ).join("")}
            </div>
          </div>
        </div>`;
    }

    themePickerBox.innerHTML = html;
    // 渲染后填充 i18n 文本
    themePickerBox.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
  }

  function renderThemeCard(
    name: Theme,
    checked: boolean,
    slot: "light" | "dark",
  ): string {
    const light = isLightTheme(name);
    const borderColor = light ? "border-black" : "border-white";
    const displayName = themeDisplayName(name);
    return `
      <button class="p-1 transition-all cursor-pointer text-left" data-theme-set="${name}" data-theme-slot="${slot}">
        <div class="rounded-3xl p-2 transition-all ${checked ? "ring-2 ring-primary" : ""}">
          <div class="grid grid-cols-2 gap-1 mb-1.5 rounded-3xl bg-base-200 p-2" data-theme="${name}">
            <span class="aspect-square rounded-full bg-primary border ${borderColor}"></span>
            <span class="aspect-square rounded-full bg-secondary border ${borderColor}"></span>
            <span class="aspect-square rounded-full bg-accent border ${borderColor}"></span>
            <span class="aspect-square rounded-full bg-neutral border ${borderColor}"></span>
          </div>
          <div class="font-medium text-xs text-center truncate">${displayName}</div>
        </div>
      </button>`;
  }

  // ============== 自定义主题编辑器 ==============

  /** 获取编辑器当前编辑中的配置（未保存） */
  function getEditingConfig(): CustomThemeConfig {
    const config: CustomThemeConfig = {
      mode: customModeSelect.value as "light" | "dark",
      primary: "#000000",
      secondary: "#000000",
      accent: "#000000",
      neutral: "#000000",
      base100: "#000000",
      baseContent: "#000000",
    };
    for (const c of CUSTOM_COLORS) {
      const input = customColorsBox.querySelector<HTMLInputElement>(
        `input[data-color-input="${c.key}"]`,
      );
      if (input && /^#[0-9a-fA-F]{6}$/.test(input.value.trim())) {
        config[c.key] = input.value.trim();
      }
    }
    return config;
  }

  function renderCustomTheme(): void {
    const config = getCustomTheme() ?? DEFAULT_CUSTOM;
    customModeSelect.value = config.mode;
    customColorsBox.innerHTML = CUSTOM_COLORS.map((c) => {
      const value = config[c.key];
      return `
        <div class="flex items-center gap-3 p-2 bg-base-200/50 rounded-xl">
          <label class="relative w-9 h-9 rounded-lg border border-base-content/10 shrink-0 cursor-pointer overflow-hidden" style="background:${value}">
            <input type="color" value="${value}" data-color-picker="${c.key}" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
          <span class="text-sm flex-1">${t(c.label)}</span>
          <input type="text" value="${value}" data-color-input="${c.key}" class="input input-xs input-bordered w-24 font-mono text-center" maxlength="7" />
        </div>`;
    }).join("");
    updatePreview();
  }

  /** 把指定配置写入编辑器 UI（不保存） */
  function applyConfigToEditor(config: CustomThemeConfig): void {
    customModeSelect.value = config.mode;
    for (const c of CUSTOM_COLORS) {
      const value = config[c.key];
      const picker = customColorsBox.querySelector<HTMLInputElement>(
        `input[data-color-picker="${c.key}"]`,
      );
      const input = customColorsBox.querySelector<HTMLInputElement>(
        `input[data-color-input="${c.key}"]`,
      );
      if (picker) picker.value = value;
      if (input) input.value = value;
      const label = picker?.parentElement;
      if (label) label.style.background = value;
    }
    updatePreview();
  }

  /** 更新实时预览色块 */
  function updatePreview(): void {
    const config = getEditingConfig();
    const keys = ["primary", "secondary", "accent", "neutral"] as const;
    for (const key of keys) {
      const el = container.querySelector<HTMLElement>(`#preview-${key}`);
      if (el) el.style.background = config[key];
    }
  }

  // ============== 更新状态 ==============

  function renderUpdateStatus(): void {
    if (!isApp || !statusBox || !checkBtn) return;
    const s = updateState;
    installBtn?.classList.add("hidden");
    progressBar?.classList.add("hidden");
    const enableCheck = (on: boolean): void => {
      checkBtn.classList.toggle("btn-disabled", !on);
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

  // 语言选择
  localeList.addEventListener("change", (e) => {
    const radio = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[name='locale-radio']",
    );
    if (!radio) return;
    setLocale(radio.value as LocaleCode);
  });

  // 主题模式选择
  themeModeBox.addEventListener("change", (e) => {
    const radio = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[name='theme-mode']",
    );
    if (!radio) return;
    setThemeMode(radio.value as ThemeMode);
  });

  // 底边栏样式选择
  navStyleBox.addEventListener("change", (e) => {
    const radio = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[name='nav-style']",
    );
    if (!radio) return;
    setNavStyle(radio.value as NavStyle);
  });

  // 主题卡片选择（事件委托）
  themePickerBox.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-theme-set]",
    );
    if (!btn) return;
    const theme = btn.dataset.themeSet as Theme;
    const slot = btn.dataset.themeSlot as "light" | "dark";
    if (slot === "light") {
      setDefaultLightTheme(theme);
    } else {
      setDefaultDarkTheme(theme);
    }
  });

  // 槽位展开/收起状态同步
  themePickerBox.addEventListener("change", (e) => {
    const toggle = (e.target as HTMLElement).closest<HTMLInputElement>(
      "[data-slot-toggle]",
    );
    if (!toggle) return;
    const slot = toggle.dataset.slotToggle;
    if (slot === "light") lightSlotExpanded = toggle.checked;
    if (slot === "dark") darkSlotExpanded = toggle.checked;
  });

  // 自定义主题：颜色选择器实时更新
  customColorsBox.addEventListener("input", (e) => {
    const picker = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[data-color-picker]",
    );
    const input = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[data-color-input]",
    );
    if (picker) {
      const key = picker.dataset.colorPicker!;
      const textInput = customColorsBox.querySelector<HTMLInputElement>(
        `input[data-color-input="${key}"]`,
      );
      const label = picker.parentElement;
      if (textInput) textInput.value = picker.value;
      if (label) label.style.background = picker.value;
      updatePreview();
    } else if (input) {
      const val = input.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        const key = input.dataset.colorInput!;
        const pickerEl = customColorsBox.querySelector<HTMLInputElement>(
          `input[data-color-picker="${key}"]`,
        );
        const label = pickerEl?.parentElement;
        if (pickerEl) pickerEl.value = val;
        if (label) label.style.background = val;
        updatePreview();
      }
    }
  });

  // 自定义主题：从当前激活主题读取颜色
  customFromCurrentBtn.addEventListener("click", () => {
    const currentTheme = getTheme();
    const colors = readThemeColors(currentTheme);
    applyConfigToEditor(colors);
  });

  // 自定义主题保存：保存后自动设为对应模式的默认主题
  customSaveBtn.addEventListener("click", () => {
    const config = getEditingConfig();
    setCustomTheme(config);
    if (config.mode === "light") {
      setDefaultLightTheme("custom");
    } else {
      setDefaultDarkTheme("custom");
    }
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
    renderThemeMode();
    renderThemePicker();
    container.dispatchEvent(
      new CustomEvent("settings:icons-stale", { bubbles: true }),
    );
  });
  const offLocale = onLocaleChange(() => refresh());
  const offNavStyle = onNavStyleChange(() => {
    renderNavStyle();
  });

  void loadVersion();
  refresh();

  return {
    refresh,
    destroy() {
      offTheme();
      offLocale();
      offNavStyle();
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
