// 应用框架：卡片墙主页 + 工具详情页 + 底部导航
// 纯 DaisyUI 组件：navbar / btm-nav / card / dropdown / menu / btn

import {
  createIcons,
  ArrowLeft,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Home,
  Info,
  LayoutGrid,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Search,
  Settings,
  Star,
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

declareModule(() => import("./modules/server-motd"));
declareModule(() => import("./modules/settings"));

const ICONS = {
  AlertCircle,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Home,
  Info,
  LayoutGrid,
  MessageCircle,
  RefreshCw,
  SatelliteDish,
  Search,
  Settings,
  Star,
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
          <h1 class="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">${t("app.title")}</h1>
        </div>
      </div>

      <main class="flex-1 pb-24">
        <!-- 卡片墙主页 -->
        <section id="home-view" class="max-w-2xl mx-auto">
          <!-- 搜索框：圆角矩形卡片 -->
          <div class="px-4 pt-4">
            <label class="flex items-center gap-3 bg-base-100 rounded-2xl px-5 py-3.5 shadow-sm">
              <i data-lucide="search" class="w-5 h-5 text-primary opacity-70 shrink-0"></i>
              <input id="search-input" type="text" class="bg-transparent outline-none flex-1 text-sm placeholder:opacity-50" data-i18n-placeholder="app.search.placeholder" placeholder="${t("app.search.placeholder")}" />
            </label>
          </div>

          <!-- 区块标题：可点击跳转全局分类视图 -->
          <button id="tools-header" class="px-4 pt-6 pb-3 flex items-center gap-2 w-full">
            <span class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <i data-lucide="layout-grid" class="w-4 h-4 text-primary"></i>
            </span>
            <h2 class="font-bold text-base flex-1 text-left" data-i18n="app.tools"></h2>
            <i data-lucide="chevron-right" class="w-4 h-4 opacity-40"></i>
          </button>

          <!-- 工具卡片网格：2 列 -->
          <div id="tool-grid" class="px-4 grid grid-cols-2 gap-3"></div>
          <div id="empty-hint" class="hidden text-center py-20 opacity-50">
            <p data-i18n="app.empty"></p>
          </div>
        </section>

        <!-- 全局分类视图 -->
        <section id="category-view" class="hidden max-w-2xl mx-auto">
          <div class="navbar bg-base-100/90 backdrop-blur sticky top-14 z-20 px-2 min-h-14 border-b border-base-200">
            <div class="navbar-start">
              <button id="cat-back-btn" class="btn btn-sm btn-ghost gap-1">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span data-i18n="app.back"></span>
              </button>
            </div>
            <div class="navbar-center">
              <span class="font-semibold" data-i18n="app.categories"></span>
            </div>
          </div>
          <div id="category-list" class="p-4 space-y-3"></div>
        </section>

        <!-- 工具详情页 -->
        <section id="detail-view" class="hidden">
          <div class="navbar bg-base-100/90 backdrop-blur sticky top-14 z-20 px-4 min-h-14 border-b border-base-200">
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
          <div id="module-container" class="max-w-2xl mx-auto p-4"></div>
        </section>
      </main>

      <!-- 底部导航：自定义 flex，激活态圆形高亮底 -->
      <footer class="bg-base-100 border-t border-base-200 z-30 sticky bottom-0">
        <nav class="flex justify-around items-center h-16 max-w-2xl mx-auto">
          <button id="nav-home" class="flex flex-col items-center gap-0.5 py-1" data-nav="home">
            <span class="nav-icon w-9 h-9 rounded-full flex items-center justify-center transition-colors">
              <i data-lucide="home" class="w-5 h-5"></i>
            </span>
            <span class="nav-label text-[10px]" data-i18n="app.home"></span>
          </button>
          <button id="nav-settings" class="flex flex-col items-center gap-0.5 py-1" data-nav="settings" ${settingsModule ? "" : "disabled"}>
            <span class="nav-icon w-9 h-9 rounded-full flex items-center justify-center transition-colors">
              <i data-lucide="settings" class="w-5 h-5"></i>
            </span>
            <span class="nav-label text-[10px]" data-i18n="app.settings"></span>
          </button>
        </nav>
      </footer>
    </div>
  `;

  const homeView = qs<HTMLElement>(root, "#home-view");
  const detailView = qs<HTMLElement>(root, "#detail-view");
  const categoryView = qs<HTMLElement>(root, "#category-view");
  const toolGrid = qs<HTMLElement>(root, "#tool-grid");
  const emptyHint = qs<HTMLElement>(root, "#empty-hint");
  const categoryList = qs<HTMLElement>(root, "#category-list");
  const container = qs<HTMLElement>(root, "#module-container");
  const detailTitle = qs<HTMLElement>(root, "#detail-title");
  const backBtn = qs<HTMLButtonElement>(root, "#back-btn");
  const catBackBtn = qs<HTMLButtonElement>(root, "#cat-back-btn");
  const toolsHeader = qs<HTMLButtonElement>(root, "#tools-header");
  const searchInput = qs<HTMLInputElement>(root, "#search-input");
  const navHome = qs<HTMLElement>(root, "#nav-home");
  const navSettings = qs<HTMLElement>(root, "#nav-settings");

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
      const m = modules.find((x) => x.id === activeModuleId);
      if (m) detailTitle.textContent = t(m.nameKey);
    }
  }

  function refreshIcons(): void {
    createIcons({ icons: ICONS, attrs: { "stroke-width": 2 } });
  }

  function setNav(tab: NavTab): void {
    const apply = (btn: HTMLElement, active: boolean) => {
      const icon = btn.querySelector<HTMLElement>(".nav-icon");
      const label = btn.querySelector<HTMLElement>(".nav-label");
      if (icon) {
        icon.classList.toggle("bg-primary/15", active);
        icon.classList.toggle("text-primary", active);
      }
      if (label) {
        label.classList.toggle("text-primary", active);
        label.classList.toggle("font-medium", active);
      }
    };
    apply(navHome, tab === "home");
    apply(navSettings, tab === "settings");
  }

  function showHome(): void {
    deactivateActive();
    activeModuleId = null;
    detailView.classList.add("hidden");
    categoryView.classList.add("hidden");
    homeView.classList.remove("hidden");
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  function showCategoryView(): void {
    homeView.classList.add("hidden");
    detailView.classList.add("hidden");
    categoryView.classList.remove("hidden");
    renderCategoryView();
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  function renderCategoryView(): void {
    // 按分类分组工具
    const grouped = new Map<ModuleCategory, ModuleRegistration[]>();
    for (const cat of CATEGORIES) grouped.set(cat.key, []);
    for (const m of tools) {
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
            <input type="checkbox" checked />
            <div class="collapse-title font-medium flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <i data-lucide="${c.icon}" class="w-4 h-4 text-primary"></i>
              </span>
              <span>${t(c.nameKey)}</span>
              <span class="badge badge-sm badge-ghost ml-1">${items.length}</span>
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
    homeView.classList.add("hidden");
    categoryView.classList.add("hidden");
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
    categoryView.classList.add("hidden");
    detailView.classList.remove("hidden");
    activateModule(m.id, container);
    setNav("home");
    window.scrollTo({ top: 0 });
  }

  renderToolGrid();
  refreshStaticText();
  refreshIcons();
  setNav("home");

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

  backBtn.addEventListener("click", showHome);
  catBackBtn.addEventListener("click", showHome);
  toolsHeader.addEventListener("click", showCategoryView);
  navHome.addEventListener("click", showHome);
  navSettings.addEventListener("click", showSettings);

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderToolGrid();
  });

  container.addEventListener("settings:icons-stale", () => {
    refreshIcons();
  });

  onLocaleChange(() => {
    refreshStaticText();
    renderToolGrid();
  });
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}
