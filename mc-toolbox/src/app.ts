// 应用框架：卡片墙主页 + 工具详情页 + 底边栏
// 全部使用 DaisyUI 组件类（navbar / menu / card / btn / footer / tabs）
// - 主页：响应式 grid，每个非系统模块一张工具卡片
// - 详情页：顶部返回栏 + 内容区挂载模块
// - 底边栏：版权 + 设置入口

import {
  createIcons,
  ArrowLeft,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink,
  Globe,
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

/** 构建应用骨架并挂载到 #app */
export async function mountApp(root: HTMLElement): Promise<void> {
  initLocale();
  applyTheme(resolveInitialTheme());

  const modules = await loadAllModules();
  const tools = modules.filter((m) => !m.system);
  const settingsModule = modules.find((m) => m.system && m.id === "settings");

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-base-200">
      <!-- 顶部导航栏：DaisyUI navbar -->
      <header class="navbar bg-base-100 border-b border-base-300 sticky top-0 z-30 px-4">
        <div class="flex-1">
          <span class="text-lg font-bold">${t("app.title")}</span>
        </div>
        <div class="flex-none gap-2">
          <!-- 语言：DaisyUI dropdown -->
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1">
              <i data-lucide="languages" class="w-4 h-4"></i>
              <span id="locale-label"></span>
            </div>
            <ul id="locale-menu" class="dropdown-content menu menu-sm bg-base-100 rounded-box z-40 w-40 p-2 shadow border border-base-300"></ul>
          </div>
          <!-- 主题切换 -->
          <button id="theme-btn" class="btn btn-sm btn-ghost btn-circle" aria-label="toggle theme">
            <i data-lucide="sun-moon" class="w-4 h-4"></i>
          </button>
        </div>
      </header>

      <main class="flex-1">
        <!-- 卡片墙主页 -->
        <section id="home-view" class="container mx-auto p-4">
          <div class="mb-4">
            <h2 class="text-xl font-bold" data-i18n="app.home"></h2>
            <p class="text-sm opacity-60 mt-1" data-i18n="app.tagline"></p>
          </div>
          <div id="tool-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"></div>
          <div id="empty-hint" class="hidden text-center py-20 opacity-50">
            <p data-i18n="app.empty"></p>
          </div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden">
          <div class="bg-base-100 border-b border-base-300 sticky top-16 z-20">
            <div class="container mx-auto px-4 py-2 flex items-center gap-2">
              <button id="back-btn" class="btn btn-sm btn-ghost gap-1">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span data-i18n="app.back"></span>
              </button>
              <span id="detail-title" class="font-semibold"></span>
            </div>
          </div>
          <div id="module-container" class="container mx-auto p-4"></div>
        </section>
      </main>

      <!-- 底边栏：DaisyUI footer（精简版，作为状态栏使用） -->
      <footer class="footer footer-center bg-base-100 border-t border-base-300 px-4 py-2 text-xs opacity-70 sticky bottom-0 z-30">
        <aside class="flex items-center justify-between w-full">
          <span>© 2025 MC Toolbox</span>
          <button id="settings-btn" class="btn btn-xs btn-ghost gap-1" ${
            settingsModule ? "" : "disabled"
          }>
            <i data-lucide="settings" class="w-3.5 h-3.5"></i>
            <span data-i18n="app.settings"></span>
          </button>
        </aside>
      </footer>
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
  const settingsBtn = qs<HTMLButtonElement>(root, "#settings-btn");

  let activeModuleId: string | null = null;

  // 渲染工具卡片墙（DaisyUI card）
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
          <button class="tool-card card bg-base-100 border border-base-300 cursor-pointer text-left transition hover:bg-base-200" data-module-id="${m.id}">
            <div class="card-body p-4 gap-2">
              <div class="flex items-center gap-2">
                <i data-lucide="${m.icon ?? "wrench"}" class="w-5 h-5 text-primary flex-none"></i>
                <h3 class="font-semibold text-sm truncate flex-1">${t(m.nameKey)}</h3>
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

  function enterModule(m: ModuleRegistration): void {
    activeModuleId = m.id;
    detailTitle.textContent = t(m.nameKey);
    homeView.classList.add("hidden");
    detailView.classList.remove("hidden");
    activateModule(m.id, container);
    window.scrollTo({ top: 0 });
  }

  function backToHome(): void {
    deactivateActive();
    activeModuleId = null;
    detailView.classList.add("hidden");
    homeView.classList.remove("hidden");
    window.scrollTo({ top: 0 });
  }

  renderToolGrid();
  renderLocale();
  refreshStaticText();
  refreshIcons();

  toolGrid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".tool-card");
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  backBtn.addEventListener("click", backToHome);

  settingsBtn.addEventListener("click", () => {
    if (settingsModule) enterModule(settingsModule);
  });

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
