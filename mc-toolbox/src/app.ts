// 应用框架：卡片墙主页 + 工具详情页 + 底边栏
// - 主页：响应式 grid，每个非系统模块一张工具卡片（图标 + 名称 + 简介）
// - 详情页：顶部返回栏 + 内容区挂载模块
// - 全局顶部 bar：应用标题 + 语言切换 + 主题切换
// - 底边栏：版权 + 设置入口（系统模块）
// - 系统模块（如 settings）不显示在卡片墙，仅通过底边栏入口进入

import {
  createIcons,
  ArrowLeft,
  ArrowRight,
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

// 声明所有模块（懒加载，按声明顺序展示在卡片墙；system 模块不会出现在卡片墙）
declareModule(() => import("./modules/server-motd"));
declareModule(() => import("./modules/settings"));

const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string }> = [
  { code: "zh_cn", label: "简体中文" },
  { code: "en_us", label: "English" },
];

// 按需导入用到的图标（框架级 + 各模块）。
// createIcons 会把 data-lucide 的 kebab-case 自动转 PascalCase 匹配此映射。
const ICONS = {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
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
  // 卡片墙只显示非系统模块
  const tools = modules.filter((m) => !m.system);
  const settingsModule = modules.find((m) => m.system && m.id === "settings");

  root.innerHTML = `
    <div class="min-h-full flex flex-col">
      <header class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-4 gap-2">
        <div class="flex-1">
          <h1 class="text-lg font-bold" data-i18n="app.title"></h1>
        </div>
        <div class="flex-none gap-1">
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-1" id="locale-btn">
              <i data-lucide="languages" class="w-4 h-4"></i>
              <span id="locale-label"></span>
            </div>
            <ul id="locale-menu" class="dropdown-content menu bg-base-100 rounded-box z-40 w-36 p-2 shadow border border-base-300"></ul>
          </div>
          <button id="theme-btn" class="btn btn-sm btn-ghost" aria-label="toggle theme">
            <i data-lucide="sun-moon" class="w-4 h-4"></i>
          </button>
        </div>
      </header>

      <main class="flex-1">
        <!-- 卡片墙主页 -->
        <section id="home-view" class="p-4 sm:p-6 pb-16">
          <div class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h2 class="text-2xl font-bold" data-i18n="app.home"></h2>
              <p class="text-sm opacity-60 mt-1" data-i18n="app.tagline"></p>
            </div>
            <div id="tool-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
            <div id="empty-hint" class="hidden text-center py-20 opacity-50">
              <p data-i18n="app.empty"></p>
            </div>
          </div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden pb-16">
          <div class="sticky top-16 z-20 bg-base-100/80 backdrop-blur border-b border-base-300 px-4 py-2">
            <button id="back-btn" class="btn btn-sm btn-ghost gap-1">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
              <span data-i18n="app.back"></span>
            </button>
            <span id="detail-title" class="font-semibold ml-2"></span>
          </div>
          <div id="module-container" class="p-4 sm:p-6"></div>
        </section>
      </main>

      <!-- 底边栏：版权 + 设置入口（三端都显示） -->
      <footer class="bg-base-100 border-t border-base-300 px-4 py-2 flex items-center justify-between sticky bottom-0 z-30">
        <div class="text-xs opacity-60 flex items-center gap-1">
          <span>© 2025 MC Toolbox</span>
        </div>
        <button id="settings-btn" class="btn btn-sm btn-ghost gap-1" ${
          settingsModule ? "" : "disabled"
        }>
          <i data-lucide="settings" class="w-4 h-4"></i>
          <span data-i18n="app.settings"></span>
        </button>
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

  // 渲染工具卡片墙（过滤掉 system 模块）
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
          <button class="tool-card card bg-base-100 shadow-md hover:shadow-xl border border-base-200 hover:border-primary transition-all duration-200 hover:-translate-y-1 cursor-pointer text-left group" data-module-id="${m.id}">
            <div class="card-body p-5 gap-3">
              <div class="flex items-start gap-3">
                <div class="flex-none w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-content transition-colors">
                  <i data-lucide="${m.icon ?? "wrench"}" class="w-6 h-6"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-base truncate">${t(m.nameKey)}</h3>
                  <p class="text-xs opacity-60 mt-1 line-clamp-2">${
                    m.descriptionKey ? t(m.descriptionKey) : ""
                  }</p>
                </div>
              </div>
              <div class="flex justify-end items-center text-xs opacity-40 group-hover:opacity-100 group-hover:text-primary transition">
                <span data-i18n="app.open"></span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-1"></i>
              </div>
            </div>
          </button>
        `,
      )
      .join("");
    refreshIcons();
  }

  // 渲染语言下拉
  function renderLocale(): void {
    const current = getLocale();
    localeLabel.textContent =
      LOCALE_OPTIONS.find((o) => o.code === current)?.label ?? current;
    localeMenu.innerHTML = LOCALE_OPTIONS.map(
      (o) =>
        `<li><button class="locale-option btn btn-ghost btn-sm w-full justify-start ${o.code === current ? "btn-active" : ""}" data-locale="${o.code}">${o.label}</button></li>`,
    ).join("");
  }

  // 刷新所有静态 i18n 文本与图标
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

  // 进入工具详情页
  function enterModule(m: ModuleRegistration): void {
    activeModuleId = m.id;
    detailTitle.textContent = t(m.nameKey);
    homeView.classList.add("hidden");
    detailView.classList.remove("hidden");
    activateModule(m.id, container);
    window.scrollTo({ top: 0 });
  }

  // 返回卡片墙
  function backToHome(): void {
    deactivateActive();
    activeModuleId = null;
    detailView.classList.add("hidden");
    homeView.classList.remove("hidden");
    window.scrollTo({ top: 0 });
  }

  // 初始渲染
  renderToolGrid();
  renderLocale();
  refreshStaticText();
  refreshIcons();

  // 卡片点击进入详情
  toolGrid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".tool-card");
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  // 返回按钮
  backBtn.addEventListener("click", backToHome);

  // 底边栏设置入口
  settingsBtn.addEventListener("click", () => {
    if (settingsModule) enterModule(settingsModule);
  });

  // 语言切换
  localeMenu.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      ".locale-option",
    );
    if (!btn) return;
    setLocale(btn.dataset.locale as LocaleCode);
  });

  // 主题切换
  themeBtn.addEventListener("click", () => {
    toggleTheme();
  });

  // settings 内部状态变化时，图标可能被 innerHTML 替换，需要重新渲染
  container.addEventListener("settings:icons-stale", () => {
    refreshIcons();
  });

  // 语言变化时刷新所有文本与卡片
  onLocaleChange(() => {
    refreshStaticText();
    renderToolGrid();
    renderLocale();
  });

  // 主题变化由 core/theme 内部处理，无需额外回调
  // 但保留订阅以备将来扩展（如同步图标颜色）
  onThemeChange(() => {
    // 当前主题切换通过 data-theme 属性由 DaisyUI 自动处理
  });
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}
