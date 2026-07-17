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
  THEME_NAME_KEY,
  getAllCustomThemes,
  getCustomThemeById,
  addCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  createDefaultCustomTheme,
  customThemeIdToTheme,
  isCustomTheme,
  customThemeDisplayName,
  getTheme,
  readThemeColors,
  type Theme,
  type ThemeMode,
  type CustomThemeConfig,
  type CustomRadius,
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

const RADIUS_OPTIONS: Array<{ value: CustomRadius; key: string }> = [
  { value: "none", key: "modules.settings.theme.custom.radius.none" },
  { value: "sm", key: "modules.settings.theme.custom.radius.sm" },
  { value: "md", key: "modules.settings.theme.custom.radius.md" },
  { value: "lg", key: "modules.settings.theme.custom.radius.lg" },
  { value: "full", key: "modules.settings.theme.custom.radius.full" },
];

type ColorKey =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "base100"
  | "baseContent";

const CUSTOM_COLORS: Array<{ key: ColorKey; label: string }> = [
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
    <div class="max-w-2xl mx-auto">
      <!-- 主设置视图 -->
      <div id="settings-main" class="space-y-3">
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

        <!-- 主题：入口卡片，点击进入二级视图 -->
        <button id="theme-entry" class="card bg-base-100 rounded-2xl shadow-sm w-full text-left cursor-pointer hover:shadow-md transition-shadow">
          <div class="card-body p-4 flex-row items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <i data-lucide="sun-moon" class="w-5 h-5 text-primary"></i>
            </span>
            <div class="flex-1">
              <div class="font-medium" data-i18n="modules.settings.theme.title"></div>
              <div class="text-xs opacity-60 mt-0.5" id="theme-entry-summary"></div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5 opacity-40"></i>
          </div>
        </button>

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

      <!-- 主题二级视图：默认隐藏，进入时填充 -->
      <div id="settings-theme-view" class="hidden"></div>
    </div>
  `;

  const localeList = qs<HTMLElement>(container, "#set-locale-list");
  const themeEntry = qs<HTMLButtonElement>(container, "#theme-entry");
  const themeEntrySummary = qs<HTMLElement>(container, "#theme-entry-summary");
  const settingsMain = qs<HTMLElement>(container, "#settings-main");
  const themeView = qs<HTMLElement>(container, "#settings-theme-view");
  const navStyleBox = qs<HTMLElement>(container, "#set-nav-style");
  const versionEl = container.querySelector<HTMLElement>("#set-version");
  const platformEl = container.querySelector<HTMLElement>("#set-platform");
  const checkBtn = container.querySelector<HTMLElement>("#set-check-card");
  const statusBox = container.querySelector<HTMLElement>("#set-update-status");
  const progressBar =
    container.querySelector<HTMLProgressElement>("#set-progress");
  const installBtn = container.querySelector<HTMLElement>("#set-install-card");

  let themeViewActive = false;

  function refresh(): void {
    container.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    renderLocaleList();
    renderNavStyle();
    updateThemeEntrySummary();
    if (themeViewActive) renderThemeView();
    if (platformEl) platformEl.textContent = platformLabel(platform);
    if (versionEl) versionEl.textContent = version;
    renderUpdateStatus();
  }

  /** 主设置页主题入口的摘要文字 */
  function updateThemeEntrySummary(): void {
    const mode = getThemeMode();
    const modeLabel = t(`modules.settings.theme.mode.${mode}`);
    const lightTheme = getDefaultLightTheme();
    const darkTheme = getDefaultDarkTheme();
    const lightName = isCustomTheme(lightTheme)
      ? customThemeDisplayName(lightTheme)
      : t(THEME_NAME_KEY[lightTheme as keyof typeof THEME_NAME_KEY]);
    const darkName = isCustomTheme(darkTheme)
      ? customThemeDisplayName(darkTheme)
      : t(THEME_NAME_KEY[darkTheme as keyof typeof THEME_NAME_KEY]);
    themeEntrySummary.textContent = `${modeLabel} · ${lightName} / ${darkName}`;
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

  // ============== 主题二级视图 ==============

  /** 主题显示名（内置 + 自定义） */
  function themeDisplayName(theme: Theme): string {
    if (isCustomTheme(theme)) return customThemeDisplayName(theme);
    return t(THEME_NAME_KEY[theme as keyof typeof THEME_NAME_KEY]);
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

  /** 槽位缩略图：4 个小圆点展示主题色 */
  function renderSlotSwatch(theme: Theme): string {
    if (isCustomTheme(theme)) {
      const id = theme.replace(/^custom-/, "");
      const config = getCustomThemeById(id);
      if (config) {
        return `
          <span class="flex gap-0.5">
            <span class="w-3 h-3 rounded-full border border-base-content/15" style="background:${config.primary}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/15" style="background:${config.secondary}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/15" style="background:${config.accent}"></span>
            <span class="w-3 h-3 rounded-full border border-base-content/15" style="background:${config.neutral}"></span>
          </span>`;
      }
    }
    return `
      <span class="flex gap-0.5" data-theme="${theme}">
        <span class="w-3 h-3 rounded-full bg-primary border border-base-content/15"></span>
        <span class="w-3 h-3 rounded-full bg-secondary border border-base-content/15"></span>
        <span class="w-3 h-3 rounded-full bg-accent border border-base-content/15"></span>
        <span class="w-3 h-3 rounded-full bg-neutral border border-base-content/15"></span>
      </span>`;
  }

  /** 主题卡片（内置或自定义） */
  function renderThemeCard(
    name: Theme,
    checked: boolean,
    slot: "light" | "dark",
  ): string {
    const displayName = themeDisplayName(name);
    const swatchInner = isCustomTheme(name)
      ? (() => {
          const id = name.replace(/^custom-/, "");
          const cfg = getCustomThemeById(id);
          const colors = cfg
            ? [cfg.primary, cfg.secondary, cfg.accent, cfg.neutral]
            : ["#888", "#888", "#888", "#888"];
          return colors
            .map(
              (c) =>
                `<span class="aspect-square rounded-full border border-base-content/15" style="background:${c}"></span>`,
            )
            .join("");
        })()
      : `<span class="aspect-square rounded-full bg-primary border border-base-content/15"></span>
         <span class="aspect-square rounded-full bg-secondary border border-base-content/15"></span>
         <span class="aspect-square rounded-full bg-accent border border-base-content/15"></span>
         <span class="aspect-square rounded-full bg-neutral border border-base-content/15"></span>`;
    const bgStyle = isCustomTheme(name)
      ? (() => {
          const id = name.replace(/^custom-/, "");
          const cfg = getCustomThemeById(id);
          return cfg ? `style="background:${cfg.base100}"` : "";
        })()
      : "";
    return `
      <button class="p-1 transition-all cursor-pointer text-left" data-theme-set="${name}" data-theme-slot="${slot}">
        <div class="rounded-3xl p-2 transition-all ${checked ? "ring-2 ring-primary" : ""}">
          <div class="grid grid-cols-2 gap-1 mb-1.5 rounded-3xl p-2" ${isCustomTheme(name) ? "" : `data-theme="${name}"`} ${bgStyle}>
            ${swatchInner}
          </div>
          <div class="font-medium text-xs text-center truncate">${escapeHtml(displayName)}</div>
        </div>
      </button>`;
  }

  /** 进入主题二级视图 */
  function showThemeView(): void {
    themeViewActive = true;
    settingsMain.classList.add("hidden");
    themeView.classList.remove("hidden");
    renderThemeView();
    window.scrollTo({ top: 0 });
  }

  /** 返回主设置页 */
  function hideThemeView(): void {
    themeViewActive = false;
    themeView.classList.add("hidden");
    settingsMain.classList.remove("hidden");
    updateThemeEntrySummary();
    window.scrollTo({ top: 0 });
  }

  /** 渲染主题二级视图 */
  function renderThemeView(): void {
    const mode = getThemeMode();
    const currentLight = getDefaultLightTheme();
    const currentDark = getDefaultDarkTheme();
    const customThemes = getAllCustomThemes();
    const customLightThemes = customThemes.filter((c) => c.mode === "light");
    const customDarkThemes = customThemes.filter((c) => c.mode === "dark");

    // 模式选择器
    const modeSelector = THEME_MODES.map(
      (m) =>
        `<input class="join-item btn btn-sm flex-1" type="radio" name="theme-mode" value="${m.mode}" aria-label="${t(m.key)}" ${m.mode === mode ? "checked" : ""} />`,
    ).join("");

    // 根据模式渲染主题选择区
    let pickerHtml = "";
    const buildGrid = (slot: "light" | "dark"): string => {
      const builtin = slot === "light" ? LIGHT_THEMES : DARK_THEMES;
      const customs = slot === "light" ? customLightThemes : customDarkThemes;
      const current = slot === "light" ? currentLight : currentDark;
      const cards = [
        ...builtin.map((name) => renderThemeCard(name, name === current, slot)),
        ...customs.map((c) =>
          renderThemeCard(customThemeIdToTheme(c.id), customThemeIdToTheme(c.id) === current, slot),
        ),
      ].join("");
      return `<div class="grid grid-cols-3 gap-2">${cards}</div>`;
    };

    if (mode === "light") {
      pickerHtml = `
        <div class="text-sm font-medium mb-2" data-i18n="modules.settings.theme.light-title"></div>
        ${buildGrid("light")}`;
    } else if (mode === "dark") {
      pickerHtml = `
        <div class="text-sm font-medium mb-2" data-i18n="modules.settings.theme.dark-title"></div>
        ${buildGrid("dark")}`;
    } else {
      pickerHtml = `
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
            <div class="mt-2">${buildGrid("light")}</div>
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
            <div class="mt-2">${buildGrid("dark")}</div>
          </div>
        </div>`;
    }

    // 自定义主题管理列表
    const customListHtml = customThemes.length === 0
      ? `<div class="text-sm opacity-50 text-center py-4" data-i18n="modules.settings.theme.custom.empty"></div>`
      : customThemes
          .map((c) => {
            const theme = customThemeIdToTheme(c.id);
            const inUse = currentLight === theme || currentDark === theme;
            return `
              <div class="flex items-center gap-3 p-3 bg-base-100 rounded-2xl shadow-sm" data-custom-id="${c.id}">
                <div class="grid grid-cols-2 gap-0.5 w-10 h-10 p-1 rounded-xl shrink-0" style="background:${c.base100}">
                  <span class="rounded-full border border-base-content/15" style="background:${c.primary}"></span>
                  <span class="rounded-full border border-base-content/15" style="background:${c.secondary}"></span>
                  <span class="rounded-full border border-base-content/15" style="background:${c.accent}"></span>
                  <span class="rounded-full border border-base-content/15" style="background:${c.neutral}"></span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">${escapeHtml(c.name)}</div>
                  <div class="text-xs opacity-60">${t(`modules.settings.theme.mode.${c.mode}`)}${inUse ? ` · ${t("modules.settings.theme.custom.in-use")}` : ""}</div>
                </div>
                <button class="btn btn-xs btn-ghost" data-custom-edit="${c.id}">
                  <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button class="btn btn-xs btn-ghost text-error" data-custom-delete="${c.id}" ${inUse ? "disabled" : ""}>
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>`;
          })
          .join("");

    themeView.innerHTML = `
      <div class="space-y-3">
        <!-- 返回栏 -->
        <div class="flex items-center gap-2 -mb-1">
          <button id="theme-back" class="btn btn-sm btn-ghost gap-1">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span data-i18n="app.back"></span>
          </button>
          <h2 class="font-bold text-base" data-i18n="modules.settings.theme.title"></h2>
        </div>

        <!-- 模式选择 -->
        <div class="card bg-base-100 rounded-2xl shadow-sm">
          <div class="card-body p-4">
            <div class="flex items-center gap-2 mb-3">
              <i data-lucide="sun-moon" class="w-4 h-4"></i>
              <span class="font-medium" data-i18n="modules.settings.theme.mode"></span>
            </div>
            <div class="join w-full">${modeSelector}</div>
          </div>
        </div>

        <!-- 主题选择 -->
        <div class="card bg-base-100 rounded-2xl shadow-sm">
          <div class="card-body p-4">
            ${pickerHtml}
          </div>
        </div>

        <!-- 自定义主题管理 -->
        <div class="card bg-base-100 rounded-2xl shadow-sm">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <i data-lucide="palette" class="w-4 h-4"></i>
                <span class="font-medium" data-i18n="modules.settings.theme.custom-title"></span>
              </div>
              <button id="custom-new" class="btn btn-xs btn-primary gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span data-i18n="modules.settings.theme.custom.new"></span>
              </button>
            </div>
            <div class="space-y-2">${customListHtml}</div>
          </div>
        </div>
      </div>
    `;

    // 填充 i18n 文本
    themeView.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });

    // 触发图标刷新
    container.dispatchEvent(
      new CustomEvent("settings:icons-stale", { bubbles: true }),
    );
  }

  /** 打开自定义主题编辑弹窗（新建或编辑） */
  function openCustomEditor(existingId?: string): void {
    const isNew = !existingId;
    const config: CustomThemeConfig = isNew
      ? createDefaultCustomTheme(getThemeMode() === "dark" ? "dark" : "light")
      : (getCustomThemeById(existingId!) ?? createDefaultCustomTheme());

    const dialog = document.createElement("dialog");
    dialog.className = "modal modal-open";
    // 弹窗跟随当前活跃主题
    const currentThemeAttr = document.documentElement.getAttribute("data-theme") ?? "light";
    dialog.innerHTML = `
      <div class="modal-box max-w-md" id="custom-editor-box" data-theme="${currentThemeAttr}">
        <h3 class="font-bold text-base mb-3">${isNew ? t("modules.settings.theme.custom.new-title") : t("modules.settings.theme.custom.edit-title")}</h3>
        <div class="space-y-3">
          <!-- 预览卡片 -->
          <div class="flex justify-center">
            <div class="p-1 w-28">
              <div class="rounded-3xl p-2">
                <div id="ce-preview" class="grid grid-cols-2 gap-1 mb-1.5 rounded-3xl p-2"></div>
                <input id="ce-name" type="text" maxlength="12" class="input input-xs input-ghost w-full text-center font-medium px-1" />
              </div>
            </div>
          </div>
          <!-- 主题名 -->
          <div class="flex items-center gap-2">
            <span class="text-sm flex-1" data-i18n="modules.settings.theme.custom.name"></span>
            <input id="ce-name-input" type="text" maxlength="12" class="input input-sm input-bordered w-32 text-center" value="${escapeHtml(config.name)}" />
          </div>
          <!-- 模式 -->
          <div class="flex items-center gap-2">
            <span class="text-sm flex-1" data-i18n="modules.settings.theme.custom.mode"></span>
            <select id="ce-mode" class="select select-sm select-bordered">
              <option value="light" ${config.mode === "light" ? "selected" : ""}>${t("modules.settings.theme.mode.light")}</option>
              <option value="dark" ${config.mode === "dark" ? "selected" : ""}>${t("modules.settings.theme.mode.dark")}</option>
            </select>
          </div>
          <!-- 圆角 -->
          <div class="flex items-center gap-2">
            <span class="text-sm flex-1" data-i18n="modules.settings.theme.custom.radius"></span>
            <div class="join" id="ce-radius">
              ${RADIUS_OPTIONS.map((r) =>
                `<input class="join-item btn btn-xs" type="radio" name="ce-radius" value="${r.value}" aria-label="${t(r.key)}" ${r.value === config.radius ? "checked" : ""} />`,
              ).join("")}
            </div>
          </div>
          <!-- 从当前主题载入 -->
          <button id="ce-from-current" class="btn btn-xs btn-ghost gap-1 w-full">
            <i data-lucide="arrow-down-to-line" class="w-3.5 h-3.5"></i>
            <span class="text-xs" data-i18n="modules.settings.theme.custom.from-current"></span>
          </button>
          <!-- 颜色编辑 -->
          <div id="ce-colors" class="space-y-2"></div>
        </div>
        <div class="modal-action">
          <button id="ce-cancel" class="btn btn-sm btn-ghost" data-i18n="common.cancel"></button>
          <button id="ce-save" class="btn btn-sm btn-primary" data-i18n="common.confirm"></button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button id="ce-backdrop"></button></form>
    `;
    document.body.appendChild(dialog);

    const editorBox = dialog.querySelector<HTMLElement>("#custom-editor-box")!;
    const preview = editorBox.querySelector<HTMLElement>("#ce-preview")!;
    const nameInput = editorBox.querySelector<HTMLInputElement>("#ce-name-input")!;
    const namePreview = editorBox.querySelector<HTMLInputElement>("#ce-name")!;
    const modeSelect = editorBox.querySelector<HTMLSelectElement>("#ce-mode")!;
    const radiusBox = editorBox.querySelector<HTMLElement>("#ce-radius")!;
    const colorsBox = editorBox.querySelector<HTMLElement>("#ce-colors")!;
    const fromCurrentBtn = editorBox.querySelector<HTMLButtonElement>("#ce-from-current")!;
    const cancelBtn = editorBox.querySelector<HTMLButtonElement>("#ce-cancel")!;
    const saveBtn = editorBox.querySelector<HTMLButtonElement>("#ce-save")!;
    const backdrop = dialog.querySelector<HTMLButtonElement>("#ce-backdrop")!;

    // 渲染颜色编辑器
    function renderColors(cfg: CustomThemeConfig): void {
      colorsBox.innerHTML = CUSTOM_COLORS.map((c) => {
        const value = cfg[c.key as ColorKey];
        return `
          <div class="flex items-center gap-3 p-2 bg-base-200/50 rounded-xl">
            <label class="relative w-9 h-9 rounded-lg border border-base-content/10 shrink-0 cursor-pointer overflow-hidden" style="background:${value}">
              <input type="color" value="${value}" data-color-picker="${c.key}" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
            <span class="text-sm flex-1">${t(c.label)}</span>
            <input type="text" value="${value}" data-color-input="${c.key}" class="input input-xs input-bordered w-24 font-mono text-center" maxlength="7" />
          </div>`;
      }).join("");
    }

    // 获取编辑中的配置
    function getEditing(): CustomThemeConfig {
      const cfg: CustomThemeConfig = {
        id: config.id,
        mode: modeSelect.value as "light" | "dark",
        name: nameInput.value.trim() || "Custom",
        primary: "#000000",
        secondary: "#000000",
        accent: "#000000",
        neutral: "#000000",
        base100: "#000000",
        baseContent: "#000000",
        radius: (() => {
          const checked = radiusBox.querySelector<HTMLInputElement>("input[name='ce-radius']:checked");
          return (checked?.value as CustomRadius) ?? "lg";
        })(),
      };
      for (const c of CUSTOM_COLORS) {
        const input = colorsBox.querySelector<HTMLInputElement>(`input[data-color-input="${c.key}"]`);
        if (input && /^#[0-9a-fA-F]{6}$/.test(input.value.trim())) {
          cfg[c.key as ColorKey] = input.value.trim();
        }
      }
      return cfg;
    }

    // 更新预览
    function updateEdPreview(): void {
      const cfg = getEditing();
      preview.style.background = cfg.base100;
      preview.style.color = cfg.baseContent;
      const swatchKeys: ColorKey[] = ["primary", "secondary", "accent", "neutral"];
      preview.innerHTML = swatchKeys
        .map((key) => `<span class="aspect-square rounded-full border border-base-content/15" style="background:${cfg[key]}"></span>`)
        .join("");
      namePreview.value = cfg.name;
      namePreview.style.color = cfg.baseContent;
    }

    // 把配置写入编辑器 UI
    function applyConfig(cfg: CustomThemeConfig): void {
      modeSelect.value = cfg.mode;
      nameInput.value = cfg.name;
      renderColors(cfg);
      radiusBox.querySelectorAll<HTMLInputElement>("input[name='ce-radius']").forEach((input) => {
        input.checked = input.value === cfg.radius;
      });
      updateEdPreview();
    }

    applyConfig(config);

    // 事件：颜色 picker / 文本输入
    colorsBox.addEventListener("input", (e) => {
      const picker = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-color-picker]");
      const input = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-color-input]");
      if (picker) {
        const key = picker.dataset.colorPicker!;
        const textInput = colorsBox.querySelector<HTMLInputElement>(`input[data-color-input="${key}"]`);
        const label = picker.parentElement;
        if (textInput) textInput.value = picker.value;
        if (label) label.style.background = picker.value;
        updateEdPreview();
      } else if (input) {
        const val = input.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          const key = input.dataset.colorInput!;
          const pickerEl = colorsBox.querySelector<HTMLInputElement>(`input[data-color-picker="${key}"]`);
          const label = pickerEl?.parentElement;
          if (pickerEl) pickerEl.value = val;
          if (label) label.style.background = val;
          updateEdPreview();
        }
      }
    });

    nameInput.addEventListener("input", () => {
      namePreview.value = nameInput.value || "Custom";
    });

    radiusBox.addEventListener("change", updateEdPreview);
    modeSelect.addEventListener("change", updateEdPreview);

    // 从当前主题载入
    fromCurrentBtn.addEventListener("click", () => {
      const currentTheme = getTheme();
      const colors = readThemeColors(currentTheme);
      applyConfig({ ...colors, id: config.id, name: nameInput.value.trim() || config.name });
    });

    function close(): void {
      dialog.remove();
      // 刷新图标
      container.dispatchEvent(new CustomEvent("settings:icons-stale", { bubbles: true }));
    }

    cancelBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    saveBtn.addEventListener("click", () => {
      const cfg = getEditing();
      if (isNew) {
        addCustomTheme(cfg);
      } else {
        updateCustomTheme(config.id, cfg);
      }
      close();
      renderThemeView();
    });

    // 弹窗中的图标
    container.dispatchEvent(new CustomEvent("settings:icons-stale", { bubbles: true }));
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

  // 主题入口：点击进入二级视图
  themeEntry.addEventListener("click", showThemeView);

  // 底边栏样式选择
  navStyleBox.addEventListener("change", (e) => {
    const radio = (e.target as HTMLElement).closest<HTMLInputElement>(
      "input[name='nav-style']",
    );
    if (!radio) return;
    setNavStyle(radio.value as NavStyle);
  });

  // 主题二级视图事件委托
  themeView.addEventListener("click", (e) => {
    // 返回主设置页
    if ((e.target as HTMLElement).closest("#theme-back")) {
      hideThemeView();
      return;
    }
    // 新建自定义主题
    if ((e.target as HTMLElement).closest("#custom-new")) {
      openCustomEditor();
      return;
    }
    // 编辑自定义主题
    const editBtn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-custom-edit]");
    if (editBtn) {
      openCustomEditor(editBtn.dataset.customEdit);
      return;
    }
    // 删除自定义主题
    const deleteBtn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-custom-delete]");
    if (deleteBtn && !deleteBtn.disabled) {
      const id = deleteBtn.dataset.customDelete!;
      deleteCustomTheme(id);
      renderThemeView();
      return;
    }
    // 主题卡片选择
    const themeBtn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-theme-set]");
    if (themeBtn) {
      const theme = themeBtn.dataset.themeSet as Theme;
      const slot = themeBtn.dataset.themeSlot as "light" | "dark";
      if (slot === "light") setDefaultLightTheme(theme);
      else setDefaultDarkTheme(theme);
    }
  });

  // 主题模式选择 + 槽位展开状态同步
  themeView.addEventListener("change", (e) => {
    const modeRadio = (e.target as HTMLElement).closest<HTMLInputElement>("input[name='theme-mode']");
    if (modeRadio) {
      setThemeMode(modeRadio.value as ThemeMode);
      return;
    }
    const toggle = (e.target as HTMLElement).closest<HTMLInputElement>("[data-slot-toggle]");
    if (toggle) {
      const slot = toggle.dataset.slotToggle;
      if (slot === "light") lightSlotExpanded = toggle.checked;
      if (slot === "dark") darkSlotExpanded = toggle.checked;
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
    updateThemeEntrySummary();
    if (themeViewActive) renderThemeView();
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
