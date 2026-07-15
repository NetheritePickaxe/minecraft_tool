// 主题管理：直接使用 DaisyUI 内置主题
// - 通过 <html data-theme="..."> 切换
// - 持久化到 localStorage
// - 顶栏按钮在 light/dark 间快速切换；设置页可选择全部主题

export type Theme = "light" | "dark" | "forest" | "nord";

export const THEMES: Theme[] = ["light", "dark", "forest", "nord"];

/** 主题对应的中文名 i18n 键 */
export const THEME_NAME_KEY: Record<Theme, string> = {
  light: "modules.settings.theme.name.light",
  dark: "modules.settings.theme.name.dark",
  forest: "modules.settings.theme.name.forest",
  nord: "modules.settings.theme.name.nord",
};

const THEME_KEY = "mc-toolbox.theme";

type ThemeChangeCallback = (theme: Theme) => void;
const listeners = new Set<ThemeChangeCallback>();

/** 当前主题（localStorage 优先，否则按系统偏好取 light/dark） */
export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved && THEMES.includes(saved)) return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** 应用主题到 <html data-theme> 并持久化 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  for (const cb of listeners) cb(theme);
}

/** 顶栏快速切换：在 light / dark 之间切换 */
export function toggleMode(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** 初始化时根据 localStorage + 系统偏好应用主题 */
export function resolveAndApply(): void {
  applyTheme(getTheme());
}

/** 订阅主题变化，返回取消订阅函数 */
export function onThemeChange(cb: ThemeChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
