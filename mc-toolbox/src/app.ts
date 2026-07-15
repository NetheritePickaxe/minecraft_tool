// 应用框架：卡片墙主页 + 工具详情页 + 底部导航
// 纯 DaisyUI 组件：navbar / btm-nav / card / dropdown / menu / btn

import {
  createIcons,
  ArrowLeft,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink,
  Globe,
  Home,
  Info,
  Languages,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Settings,
  Star,
  SunMoon,
  Wrench,
} from "lucide";
import {
  declareModule,
  loadAllModules,
  activateModule,
  deactivateActive,
} from "./core/module-loader";
import { t, getLocale, setLocale, onLocaleChange, initLocale } from "./lang";
import type { LocaleCode } from "./lang";
import type { ModuleRegistration } from "./core/types";
import {
  applyTheme,
  resolveInitialTheme,
  toggleTheme,
  onThemeChange,
} from "./core/theme";

declareModule(() => import("./modules/server-motd"));
declareModule(() => import("./modules/settings"));

const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string }> = [
  { code: "zh_cn", label: "简体中文" },
  { code: "en_us", label: "English" },
];

const ICONS = {
  AlertCircle,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle,
  Download,
  ExternalLink,
  Globe,
  Home,
  Info,
  Languages,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Settings,
  Star,
  SunMoon,
  Wrench,
};

type NavTab = "home" | "settings";

/** 构建应用骨架并挂载到 #app */
export async function mountApp(root: HTMLElement): Promise<void> {
  initLocale();
  applyTheme(resolveInitialTheme());

  const modules = await loadAllModules();
  const tools = modules.filter((m) => !m.system);
  const settingsModule = modules.find((m) => m.system && m.id === "settings");

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-base-200">
      <!-- 顶部导航栏：navbar -->
      <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-4 gap-2">
        <div class="navbar-start">
          <h1 class="text-xl font-bold">${t("app.title")}</h1>
        </div>
        <div class="navbar-end gap-1">
          <!-- 语言下拉：dropdown + menu -->
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1">
              <i data-lucide="languages" class="w-4 h-4"></i>
              <span id="locale-label"></span>
            </div>
            <ul id="locale-menu" class="dropdown-content menu menu-sm bg-base-100 rounded-box z-40 w-40 p-2 shadow"></ul>
          </div>
          <!-- 主题切换 -->
          <button id="theme-btn" class="btn btn-sm btn-ghost btn-circle" aria-label="toggle theme">
            <i data-lucide="sun-moon" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <main class="flex-1 pb-16">
        <!-- 卡片墙主页 -->
        <section id="home-view" class="max-w-6xl mx-auto p-4">
          <div class="mb-6">
            <h2 class="text-2xl font-bold" data-i18n="app.home"></h2>
            <p class="text-sm opacity-60 mt-1" data-i18n="app.tagline"></p>
          </div>
          <div id="tool-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"></div>
          <div id="empty-hint" class="hidden text-center py-20 opacity-50">
            <p data-i18n="app.empty"></p>
          </div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden">
          <div class="navbar bg-base-100 shadow-sm sticky top-16 z-20 px-4 min-h-14">
            <div class="navbar-start">
              <button id="back-btn" class="btn btn-sm btn-ghost gap-1">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span data-i18n="app.back"></span>
              </button>
            </div>
            <div class="navbar-center">
              <span id="detail-title" class="font-semibold"></span>
            </div>
          </div>
          <div id="module-container" class="max-w-4xl mx-auto p-4"></div>
        </section>
      </main>

      <!-- 底部导航：btm-nav -->
      <nav class="btm-nav btm-nav-md bg-base-100 border-t border-base-300 z-30">
        <button id="nav-home" class="active" data-nav="home">
          <i data-lucide="home" class="w-5 h-5"></i>
          <span class="btm-nav-label text-xs" data-i18n="app.home"></span>
        </button>
        <button id="nav-settings" data-nav="settings" ${settingsModule ? "" : "disabled"}>
          <i data-lucide="settings" class="w-5 h-5"></i>
          <span class="btm-nav-label text-xs" data-i18n="app.settings"></span>
        </button>
      </nav>
    </div>
  `;

  const homeView = qs<HTMLElement>(root, "#home-view");
  const detailView = qs<HTMLElement>(root, "#detail-view");
  const toolGrid = qs<HTMLElement>(root, "#tool-grid");
  const emptyHint = qs<HTMLElement>(root, "#empty-hint");
  const container = qs<HTMLElement>(root, "#module-container");
  const detailTitle = qs<HTMLElement>(root, "#detail-title");
  const backBtn = qs<HTMLButtonElement>(root, "#back-btn");
  const localeLabel = qs<HTMLElement>(root, "#locale-label");
  const localeMenu = qs<HTMLElement>(root, "#locale-menu");
  const themeBtn = qs<HTMLButtonElement>(root, "#theme-btn");
  const navHome = qs<HTMLButtonElement>(root, "#nav-home");
  const navSettings = qs<HTMLButtonElement>(root, "#nav-settings");

  let activeModuleId: string | null = null;

  // 渲染工具卡片墙：card + card-body
  function renderToolGrid(): void {
    if (tools.length === 0) {
      emptyHint.classList.remove("hidden");
      toolGrid.classList.add("hidden");
      return;
    }
    emptyHint.classList.add("hidden");
    toolGrid.classList.remove("hidden");
    toolGrid.innerHTML = tools
      .map(
        (m) => `
          <button class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left" data-module-id="${m.id}">
            <div class="card-body p-4 gap-2">
              <div class="flex items-center gap-3">
                <div class="avatar">
                  <div class="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    <i data-lucide="${m.icon ?? "wrench"}" class="w-5 h-5"></i>
                  </div>
                </div>
                <h3 class="card-title text-sm font-semibold flex-1 truncate">${t(m.nameKey)}</h3>
              </div>
              <p class="text-xs opacity-60 line-clamp-2">${
                m.descriptionKey ? t(m.descriptionKey) : ""
              }</p>
            </div>
          </button>
        `,
      )
      .join("");
    refreshIcons();
  }

  function renderLocale(): void {
    const current = getLocale();
    localeLabel.textContent =
      LOCALE_OPTIONS.find((o) => o.code === current)?.label ?? current;
    localeMenu.innerHTML = LOCALE_OPTIONS.map(
      (o) =>
        `<li><a class="locale-option ${o.code === current ? "active" : ""}" data-locale="${o.code}">${o.label}</a></li>`,
    ).join("");
  }

  function refreshStaticText(): void {
    root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    if (activeModuleId) {
      const m = modules.find((x) => x.id === activeModuleId);
      if (m) detailTitle.textContent = t(m.nameKey);
    }
  }

  function refreshIcons(): void {
    createIcons({ icons: ICONS, attrs: { "stroke-width": 2 } });
  }

  function setNav(tab: NavTab): void {
    navHome.classList.toggle("active", tab === "home");
    navSettings.classList.toggle("active", tab === "settings");
  }

  function showHome(): void {
    deactivateActive();
    activeModuleId = null;
    detailView.classList.add("hidden");
    homeView.classList.remove("hidden");
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  function showSettings(): void {
    if (!settingsModule) return;
    homeView.classList.add("hidden");
    detailView.classList.remove("hidden");
    activeModuleId = settingsModule.id;
    detailTitle.textContent = t(settingsModule.nameKey);
    activateModule(settingsModule.id, container);
    setNav("settings");
    window.scrollTo({ top: 0 });
  }

  function enterModule(m: ModuleRegistration): void {
    activeModuleId = m.id;
    detailTitle.textContent = t(m.nameKey);
    homeView.classList.add("hidden");
    detailView.classList.remove("hidden");
    activateModule(m.id, container);
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  renderToolGrid();
  renderLocale();
  refreshStaticText();
  refreshIcons();

  toolGrid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-module-id]");
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  backBtn.addEventListener("click", showHome);
  navHome.addEventListener("click", showHome);
  navSettings.addEventListener("click", showSettings);

  localeMenu.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      ".locale-option",
    );
    if (!btn) return;
    setLocale(btn.dataset.locale as LocaleCode);
  });

  themeBtn.addEventListener("click", () => {
    toggleTheme();
  });

  container.addEventListener("settings:icons-stale", () => {
    refreshIcons();
  });

  onLocaleChange(() => {
    refreshStaticText();
    renderToolGrid();
    renderLocale();
  });

  onThemeChange(() => {
    // 主题切换由 data-theme 属性由 DaisyUI 自动处理
  });
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}
