// 应用框架：侧边栏 + 内容区 + 模块路由
// - 侧边栏：模块菜单（点击切换）+ 语言切换 + 主题切换
// - 内容区：挂载当前激活模块
// - 所有可见文本走 t()，语言切换时刷新侧边栏

import { declareModule, loadAllModules, activateModule } from "./core/module-loader";
import { t, getLocale, setLocale, onLocaleChange, initLocale } from "./lang";
import type { LocaleCode } from "./lang";

// 声明所有模块（懒加载，按声明顺序展示在侧边栏）
declareModule(() => import("./modules/server-motd"));

const THEME_KEY = "mc-toolbox.theme";

type Theme = "light" | "dark";

function resolveInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

/** 构建应用骨架并挂载到 #app */
export async function mountApp(root: HTMLElement): Promise<void> {
  initLocale();
  applyTheme(resolveInitialTheme());

  const modules = await loadAllModules();

  root.innerHTML = `
    <div class="drawer lg:drawer-open h-full">
      <input id="app-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-side z-20">
        <label for="app-drawer" class="drawer-overlay"></label>
        <aside class="min-h-full w-64 bg-base-200 flex flex-col">
          <div class="p-4 border-b border-base-300">
            <h1 class="text-lg font-bold" data-i18n="app.title"></h1>
            <p class="text-xs opacity-60" data-i18n="app.tagline"></p>
          </div>
          <nav id="module-nav" class="flex-1 menu menu-md gap-1 p-2"></nav>
          <div class="p-3 border-t border-base-300 flex items-center gap-2">
            <div class="dropdown dropdown-top">
              <div tabindex="0" role="button" class="btn btn-sm btn-ghost" id="locale-btn">
                <span id="locale-label"></span>
              </div>
              <ul id="locale-menu" class="dropdown-content menu bg-base-100 rounded-box z-30 w-32 p-2 shadow" tabindex="0"></ul>
            </div>
            <button id="theme-btn" class="btn btn-sm btn-ghost ml-auto" aria-label="toggle theme"></button>
          </div>
        </aside>
      </div>
      <div class="drawer-content flex flex-col">
        <div class="lg:hidden p-2 border-b border-base-300">
          <label for="app-drawer" class="btn btn-sm btn-ghost" data-i18n="app.title"></label>
        </div>
        <main id="module-container" class="flex-1 overflow-auto p-4"></main>
      </div>
    </div>
  `;

  const nav = root.querySelector<HTMLElement>("#module-nav")!;
  const container = root.querySelector<HTMLElement>("#module-container")!;
  const localeLabel = root.querySelector<HTMLElement>("#locale-label")!;
  const localeMenu = root.querySelector<HTMLElement>("#locale-menu")!;
  const themeBtn = root.querySelector<HTMLButtonElement>("#theme-btn")!;

  // 渲染侧边栏模块菜单
  function renderNav(): void {
    nav.innerHTML = modules
      .map(
        (m) =>
          `<li><button class="module-link btn btn-ghost btn-sm w-full justify-start" data-module-id="${m.id}">${t(m.nameKey)}</button></li>`,
      )
      .join("");
  }

  // 渲染语言下拉
  const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string }> = [
    { code: "zh_cn", label: "简体中文" },
    { code: "en_us", label: "English" },
  ];
  function renderLocale(): void {
    const current = getLocale();
    localeLabel.textContent =
      LOCALE_OPTIONS.find((o) => o.code === current)?.label ?? current;
    localeMenu.innerHTML = LOCALE_OPTIONS.map(
      (o) =>
        `<li><button class="locale-option btn btn-ghost btn-sm w-full justify-start ${o.code === current ? "btn-active" : ""}" data-locale="${o.code}">${o.label}</button></li>`,
    ).join("");
  }

  // 主题按钮文本
  function renderThemeBtn(): void {
    themeBtn.textContent =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "🌙"
        : "☀️";
  }

  // 刷新所有静态 i18n 文本
  function refreshStaticText(): void {
    root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
  }

  renderNav();
  renderLocale();
  renderThemeBtn();
  refreshStaticText();

  // 默认激活第一个模块
  if (modules.length > 0) {
    activateModule(modules[0].id, container);
    markActive(modules[0].id);
  }

  // 模块切换
  nav.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".module-link");
    if (!btn) return;
    const id = btn.dataset.moduleId!;
    activateModule(id, container);
    markActive(id);
    // 移动端：切换后收起抽屉
    (root.querySelector("#app-drawer") as HTMLInputElement).checked = false;
  });

  function markActive(id: string): void {
    nav.querySelectorAll<HTMLElement>(".module-link").forEach((btn) => {
      btn.classList.toggle("btn-active", btn.dataset.moduleId === id);
    });
  }

  // 语言切换
  localeMenu.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".locale-option");
    if (!btn) return;
    setLocale(btn.dataset.locale as LocaleCode);
  });

  // 主题切换
  themeBtn.addEventListener("click", () => {
    const next: Theme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
    renderThemeBtn();
  });

  // 语言变化时刷新静态文本与侧边栏
  onLocaleChange(() => {
    refreshStaticText();
    renderNav();
    renderLocale();
    markActive(getActiveModuleId());
  });

  function getActiveModuleId(): string {
    const active = nav.querySelector<HTMLElement>(".module-link.btn-active");
    return active?.dataset.moduleId ?? modules[0]?.id ?? "";
  }
}
