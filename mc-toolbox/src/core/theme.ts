// 主题管理：light / dark
// - 持久化到 localStorage
// - 通过 data-theme 属性切换 DaisyUI 主题
// - 支持订阅主题变化（用于同步 UI 状态）

const THEME_KEY = "mc-toolbox.theme";

export type Theme = "light" | "dark";

type ThemeChangeCallback = (theme: Theme) => void;
const listeners = new Set<ThemeChangeCallback>();

/** 根据系统偏好 + localStorage 确定初始主题 */
export function resolveInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
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

/** 当前主题（从 DOM 读取） */
export function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/** 切换主题（light ↔ dark） */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** 订阅主题变化，返回取消订阅函数 */
export function onThemeChange(cb: ThemeChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
