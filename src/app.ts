// 应用框架：卡片墙主页 + 工具详情页 + 底部导航
// 纯 DaisyUI 组件：navbar / btm-nav / card / dropdown / menu / btn

import {
  createIcons,
  ArrowLeft,
  ArrowUpCircle,
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Globe,
  Home,
  Info,
  Languages,
  LayoutGrid,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Search,
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
import { t, onLocaleChange, initLocale } from "./lang";
import type { ModuleRegistration, ModuleCategory } from "./core/types";
import { resolveAndApply } from "./core/theme";
import {
  getNavStyle,
  onNavStyleChange,
  type NavStyle,
} from "./core/layout";

declareModule(() => import("./modules/server-motd"));
declareModule(() => import("./modules/settings"));

const ICONS = {
  AlertCircle,
  ArrowLeft,
  ArrowUpCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Globe,
  Home,
  Info,
  Languages,
  LayoutGrid,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Search,
  Settings,
  Star,
  SunMoon,
  Wrench,
};

type NavTab = "home" | "settings";

/** 分类顺序 + i18n 键 + 图标 */
const CATEGORIES: Array<{
  key: ModuleCategory;
  nameKey: string;
  icon: string;
}> = [
  { key: "server", nameKey: "app.category.server", icon: "satellite-dish" },
  { key: "world", nameKey: "app.category.world", icon: "globe" },
  { key: "player", nameKey: "app.category.player", icon: "star" },
  { key: "utility", nameKey: "app.category.utility", icon: "wrench" },
];

/** 构建应用骨架并挂载到 #app */
export async function mountApp(root: HTMLElement): Promise<void> {
  initLocale();
  resolveAndApply();

  const modules = await loadAllModules();
  const tools = modules.filter((m) => !m.system);
  const settingsModule = modules.find((m) => m.system && m.id === "settings");

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-base-200">
      <!-- 顶部导航栏：navbar（白底，仅标题） -->
      <div class="navbar bg-base-100 sticky top-0 z-30 px-4 min-h-14 border-b border-base-200">
        <div class="navbar-start">
          <h1 class="text-xl font-extrabold text-base-content">${t("app.title")}</h1>
        </div>
      </div>

      <main id="app-main" class="flex-1 pb-16 pt-[env(safe-area-inset-top,0px)]">
        <!-- 搜索框：全局共享，home/category 视图都显示 -->
        <div id="search-wrapper" class="px-4 pt-4 max-w-2xl mx-auto">
          <label class="flex items-center gap-3 bg-base-100 rounded-2xl px-5 py-3.5 shadow-sm">
            <i data-lucide="search" class="w-5 h-5 text-primary opacity-70 shrink-0"></i>
            <input id="search-input" type="text" class="bg-transparent outline-none flex-1 text-sm placeholder:opacity-50" data-i18n-placeholder="app.search.placeholder" placeholder="${t("app.search.placeholder")}" />
          </label>
        </div>

        <!-- 卡片墙主页 -->
        <section id="home-view" class="max-w-2xl mx-auto transition-all duration-200 ease-out origin-top">
          <!-- 区块标题：只有图标和文字可点击进入分类视图 -->
          <div class="px-4 pt-6 pb-3 flex items-center gap-2">
            <button id="tools-header-icon" class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer">
              <i data-lucide="layout-grid" class="w-4 h-4 text-primary"></i>
            </button>
            <button id="tools-header-text" class="font-bold text-base flex-1 text-left cursor-pointer" data-i18n="app.tools"></button>
          </div>

          <!-- 工具卡片网格：2 列 -->
          <div id="tool-grid" class="px-4 grid grid-cols-2 gap-3"></div>
          <div id="empty-hint" class="hidden text-center py-20 opacity-50">
            <p data-i18n="app.empty"></p>
          </div>
        </section>

        <!-- 全局分类视图 -->
        <section id="category-view" class="hidden max-w-2xl mx-auto transition-all duration-200 ease-out origin-top scale-95 opacity-0">
          <!-- 分类视图标题栏：与搜索框风格一致 -->
          <div class="px-4 pt-4 pb-3 flex items-center gap-2">
            <button id="cat-back-btn" class="btn btn-sm btn-ghost gap-1">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
              <span data-i18n="app.back"></span>
            </button>
            <h2 class="font-bold text-base" data-i18n="app.categories"></h2>
          </div>
          <div id="category-list" class="px-4 pb-4 space-y-3"></div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden">
          <div id="module-container" class="max-w-2xl mx-auto p-4"></div>
        </section>
      </main>

      <!-- 底部导航容器：内容由 renderNav() 根据 NavStyle 注入 -->
      <div id="nav-container"></div>
    </div>
  `;

  const homeView = qs<HTMLElement>(root, "#home-view");
  const detailView = qs<HTMLElement>(root, "#detail-view");
  const categoryView = qs<HTMLElement>(root, "#category-view");
  const toolGrid = qs<HTMLElement>(root, "#tool-grid");
  const emptyHint = qs<HTMLElement>(root, "#empty-hint");
  const categoryList = qs<HTMLElement>(root, "#category-list");
  const container = qs<HTMLElement>(root, "#module-container");
  const catBackBtn = qs<HTMLButtonElement>(root, "#cat-back-btn");
  const toolsHeaderIcon = qs<HTMLButtonElement>(root, "#tools-header-icon");
  const toolsHeaderText = qs<HTMLButtonElement>(root, "#tools-header-text");
  const searchInput = qs<HTMLInputElement>(root, "#search-input");
  const searchWrapper = qs<HTMLElement>(root, "#search-wrapper");
  const navContainer = qs<HTMLElement>(root, "#nav-container");
  const appMain = qs<HTMLElement>(root, "#app-main");
  let navHome: HTMLElement | null = null;
  let navSettings: HTMLElement | null = null;
  let currentTab: NavTab = "home";

  let activeModuleId: string | null = null;
  let searchQuery = "";

  // 渲染工具卡片墙：图标方块(软色背景) + 标题 + 副标题(2行省略)
  function renderToolGrid(): void {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? tools.filter(
          (m) =>
            t(m.nameKey).toLowerCase().includes(q) ||
            (m.descriptionKey &&
              t(m.descriptionKey).toLowerCase().includes(q)),
        )
      : tools;

    if (filtered.length === 0) {
      emptyHint.classList.remove("hidden");
      toolGrid.classList.add("hidden");
      return;
    }
    emptyHint.classList.add("hidden");
    toolGrid.classList.remove("hidden");
    toolGrid.innerHTML = filtered
      .map(
        (m) => `
          <button class="card bg-base-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left" data-module-id="${m.id}">
            <span class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <i data-lucide="${m.icon ?? "wrench"}" class="w-5 h-5 text-primary"></i>
            </span>
            <h3 class="font-bold text-sm leading-tight">${t(m.nameKey)}</h3>
            <p class="text-xs opacity-60 line-clamp-2 mt-1 leading-snug">${
              m.descriptionKey ? t(m.descriptionKey) : ""
            }</p>
          </button>
        `,
      )
      .join("");
    refreshIcons();
  }

  function refreshStaticText(): void {
    root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    root
      .querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")
      .forEach((el) => {
        el.placeholder = t(el.dataset.i18nPlaceholder!);
      });
    if (activeModuleId) {
      // detailTitle removed - no longer needed
    }
  }

  function refreshIcons(): void {
    createIcons({ icons: ICONS, attrs: { "stroke-width": 2 } });
  }

  function setNav(tab: NavTab): void {
    currentTab = tab;
    const style = getNavStyle();
    const apply = (btn: HTMLElement, active: boolean) => {
      if (style === "floating") {
        btn.classList.toggle("btn-primary", active);
        btn.classList.toggle("btn-ghost", !active);
      } else {
        btn.classList.toggle("active", active);
        btn.classList.toggle("text-primary", active);
        btn.classList.toggle("text-base-content/60", !active);
      }
    };
    if (navHome) apply(navHome, tab === "home");
    if (navSettings) apply(navSettings, tab === "settings");
  }

  /** 根据底边栏样式生成 HTML */
  function buildNavHtml(style: NavStyle): string {
    if (style === "floating") {
      return `
        <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-base-100/95 backdrop-blur-md rounded-full shadow-lg border border-base-200 px-2 py-1.5">
          <button id="nav-home" class="btn btn-sm rounded-full gap-1 px-3" data-nav="home">
            <i data-lucide="home" class="w-4 h-4"></i>
            <span class="text-xs" data-i18n="app.home"></span>
          </button>
          ${
            settingsModule
              ? `<button id="nav-settings" class="btn btn-sm rounded-full gap-1 px-3" data-nav="settings">
            <i data-lucide="settings" class="w-4 h-4"></i>
            <span class="text-xs" data-i18n="app.settings"></span>
          </button>`
              : ""
          }
        </div>
      `;
    }
    return `
      <div class="btm-nav btm-nav-sm border-t border-base-200 bg-base-100 z-30">
        <button id="nav-home" class="text-base-content/60" data-nav="home">
          <i data-lucide="home" class="w-5 h-5"></i>
          <span class="btm-nav-label text-xs" data-i18n="app.home"></span>
        </button>
        ${
          settingsModule
            ? `<button id="nav-settings" class="text-base-content/60" data-nav="settings">
          <i data-lucide="settings" class="w-5 h-5"></i>
          <span class="btm-nav-label text-xs" data-i18n="app.settings"></span>
        </button>`
            : ""
        }
      </div>
    `;
  }

  /** 渲染底边栏：根据当前 NavStyle 注入 HTML、绑定事件、刷新图标与激活态 */
  function renderNav(): void {
    const style = getNavStyle();
    // 悬浮样式需要更多底部留白
    appMain.classList.toggle("pb-16", style === "normal");
    appMain.classList.toggle("pb-24", style === "floating");
    navContainer.innerHTML = buildNavHtml(style);
    navHome = navContainer.querySelector<HTMLElement>("#nav-home");
    navSettings = navContainer.querySelector<HTMLElement>("#nav-settings");
    navHome?.addEventListener("click", showHome);
    navSettings?.addEventListener("click", showSettings);
    refreshStaticText();
    refreshIcons();
    setNav(currentTab);
  }

  function showHome(): void {
    deactivateActive();
    activeModuleId = null;
    searchWrapper.classList.remove("hidden");
    detailView.classList.add("hidden");
    categoryView.classList.remove("scale-100", "opacity-100");
    categoryView.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      categoryView.classList.add("hidden");
      homeView.classList.remove("hidden");
    }, 200);
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  function showCategoryView(): void {
    searchWrapper.classList.remove("hidden");
    homeView.classList.add("hidden");
    detailView.classList.add("hidden");
    categoryView.classList.remove("hidden");
    requestAnimationFrame(() => {
      categoryView.classList.remove("scale-95", "opacity-0");
      categoryView.classList.add("scale-100", "opacity-100");
    });
    renderCategoryView();
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  function renderCategoryView(): void {
    const q = searchQuery.trim().toLowerCase();
    // 按分类分组工具，同时按搜索过滤
    const grouped = new Map<ModuleCategory, ModuleRegistration[]>();
    for (const cat of CATEGORIES) grouped.set(cat.key, []);
    for (const m of tools) {
      if (q) {
        const name = t(m.nameKey).toLowerCase();
        const desc = m.descriptionKey
          ? t(m.descriptionKey).toLowerCase()
          : "";
        if (!name.includes(q) && !desc.includes(q)) continue;
      }
      const cat: ModuleCategory = m.category ?? "utility";
      grouped.get(cat)?.push(m);
    }

    categoryList.innerHTML = CATEGORIES.filter((c) =>
      (grouped.get(c.key) ?? []).length > 0,
    )
      .map((c) => {
        const items = grouped.get(c.key) ?? [];
        const cards = items
          .map(
            (m) => `
              <button class="card bg-base-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left" data-module-id="${m.id}">
                <span class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <i data-lucide="${m.icon ?? "wrench"}" class="w-5 h-5 text-primary"></i>
                </span>
                <h3 class="font-bold text-sm leading-tight">${t(m.nameKey)}</h3>
                <p class="text-xs opacity-60 line-clamp-2 mt-1 leading-snug">${m.descriptionKey ? t(m.descriptionKey) : ""}</p>
              </button>
            `,
          )
          .join("");
        return `
          <div class="collapse collapse-arrow bg-base-100 rounded-2xl shadow-sm">
            <input type="checkbox" />
            <div class="collapse-title font-medium flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <i data-lucide="${c.icon}" class="w-4 h-4 text-primary"></i>
              </span>
              <span class="flex-1">${t(c.nameKey)}</span>
              <span class="badge badge-sm badge-ghost">${items.length}</span>
            </div>
            <div class="collapse-content">
              <div class="grid grid-cols-2 gap-3 mt-2">${cards}</div>
            </div>
          </div>
        `;
      })
      .join("");
    refreshIcons();
  }

  function showSettings(): void {
    if (!settingsModule) return;
    searchWrapper.classList.add("hidden");
    homeView.classList.add("hidden");
    categoryView.classList.add("hidden");
    categoryView.classList.remove("scale-100", "opacity-100");
    categoryView.classList.add("scale-95", "opacity-0");
    detailView.classList.remove("hidden");
    activeModuleId = settingsModule.id;
    activateModule(settingsModule.id, container);
    setNav("settings");
    window.scrollTo({ top: 0 });
  }

  function enterModule(m: ModuleRegistration): void {
    activeModuleId = m.id;
    searchWrapper.classList.add("hidden");
    homeView.classList.add("hidden");
    categoryView.classList.add("hidden");
    categoryView.classList.remove("scale-100", "opacity-100");
    categoryView.classList.add("scale-95", "opacity-0");
    detailView.classList.remove("hidden");
    activateModule(m.id, container);
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  renderToolGrid();
  refreshStaticText();
  refreshIcons();
  renderNav();

  toolGrid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-module-id]");
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  categoryList.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-module-id]");
    if (!card) return;
    const id = card.dataset.moduleId!;
    const m = tools.find((x) => x.id === id);
    if (m) enterModule(m);
  });

  catBackBtn.addEventListener("click", showHome);
  toolsHeaderIcon.addEventListener("click", showCategoryView);
  toolsHeaderText.addEventListener("click", showCategoryView);

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderToolGrid();
    if (!categoryView.classList.contains("hidden")) {
      renderCategoryView();
    }
  });

  container.addEventListener("settings:icons-stale", () => {
    refreshIcons();
  });

  onLocaleChange(() => {
    refreshStaticText();
    renderToolGrid();
  });

  onNavStyleChange(() => {
    renderNav();
  });
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}
