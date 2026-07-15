// 应用框架：MD3 风格卡片墙主页 + 工具详情页 + 底部 NavigationBar
// 视觉规范：Material Design 3
// - Top App Bar（标题 + 语言/主题 icon button）
// - 卡片墙（filled clickable cards，圆形图标 container）
// - 底部 NavigationBar（首页 + 设置，带 active indicator pill）

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
      <!-- MD3 Top App Bar -->
      <header class="md3-appbar">
        <span class="md3-appbar-title">${t("app.title")}</span>
        <div class="flex-none gap-1 flex items-center">
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="md3-btn-text md3-btn-sm gap-1">
              <i data-lucide="languages" class="w-4 h-4"></i>
              <span id="locale-label"></span>
            </div>
            <ul id="locale-menu" class="dropdown-content menu menu-sm bg-base-100 rounded-lg z-40 w-40 p-1 shadow-lg border border-base-300"></ul>
          </div>
          <button id="theme-btn" class="md3-btn-text md3-btn-sm !px-2" aria-label="toggle theme">
            <i data-lucide="sun-moon" class="w-4 h-4"></i>
          </button>
        </div>
      </header>

      <main class="flex-1 pb-20">
        <!-- 卡片墙主页 -->
        <section id="home-view" class="max-w-6xl mx-auto p-4">
          <div class="mb-5">
            <h2 class="text-2xl font-normal tracking-tight" data-i18n="app.home"></h2>
            <p class="text-sm text-base-content/60 mt-1" data-i18n="app.tagline"></p>
          </div>
          <div id="tool-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"></div>
          <div id="empty-hint" class="hidden text-center py-20 text-base-content/50">
            <p data-i18n="app.empty"></p>
          </div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden">
          <div class="md3-appbar !h-14 top-16">
            <button id="back-btn" class="md3-btn-text md3-btn-sm !px-2 gap-1">
              <i data-lucide="arrow-left" class="w-5 h-5"></i>
            </button>
            <span id="detail-title" class="text-lg font-medium flex-1"></span>
          </div>
          <div id="module-container" class="max-w-4xl mx-auto p-4"></div>
        </section>
      </main>

      <!-- MD3 NavigationBar -->
      <nav class="md3-nav-bar">
        <button id="nav-home" class="md3-nav-item active" data-nav="home">
          <span class="md3-nav-icon">
            <i data-lucide="home" class="w-5 h-5"></i>
          </span>
          <span class="md3-nav-label" data-i18n="app.home"></span>
        </button>
        <button id="nav-settings" class="md3-nav-item" data-nav="settings" ${
          settingsModule ? "" : "disabled"
        }>
          <span class="md3-nav-icon">
            <i data-lucide="settings" class="w-5 h-5"></i>
          </span>
          <span class="md3-nav-label" data-i18n="app.settings"></span>
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

  // 渲染工具卡片墙（MD3 filled clickable card）
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
          <button class="md3-card-clickable text-left" data-module-id="${m.id}">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-none">
                <i data-lucide="${m.icon ?? "wrench"}" class="w-5 h-5"></i>
              </div>
              <h3 class="font-medium text-sm truncate flex-1">${t(m.nameKey)}</h3>
            </div>
            <p class="text-xs text-base-content/60 line-clamp-2 leading-relaxed">${
              m.descriptionKey ? t(m.descriptionKey) : ""
            }</p>
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
        `<li><a class="locale-option rounded-lg ${o.code === current ? "active bg-secondary text-secondary-content" : ""}" data-locale="${o.code}">${o.label}</a></li>`,
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
    setNav("home"); // 工具详情页仍属于"首页"导航
    window.scrollTo({ top: 0 });
  }

  function backToHome(): void {
    showHome();
  }

  renderToolGrid();
  renderLocale();
  refreshStaticText();
  refreshIcons();

  toolGrid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      ".md3-card-clickable",
    );
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  backBtn.addEventListener("click", backToHome);
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
