// 主题管理：色系（ColorScheme）+ 明暗（Mode）两维度
// - 色系：grass / diamond / nether / redstone / gold / end
// - 明暗：light / dark
// - 组合后写入 <html data-theme="grass-dark">，由 DaisyUI 切换
// - 两个维度分别持久化到 localStorage

export type ColorScheme =
  | "grass"
  | "diamond"
  | "nether"
  | "redstone"
  | "gold"
  | "end";

export type Mode = "light" | "dark";

const SCHEME_KEY = "mc-toolbox.color-scheme";
const MODE_KEY = "mc-toolbox.mode";

export const COLOR_SCHEMES: ColorScheme[] = [
  "grass",
  "diamond",
  "nether",
  "redstone",
  "gold",
  "end",
];

type ThemeChangeCallback = (scheme: ColorScheme, mode: Mode) => void;
const listeners = new Set<ThemeChangeCallback>();

/** 当前色系（从 localStorage 读取，默认 grass） */
export function getColorScheme(): ColorScheme {
  const saved = localStorage.getItem(SCHEME_KEY) as ColorScheme | null;
  return saved && COLOR_SCHEMES.includes(saved) ? saved : "grass";
}

/** 当前明暗模式（localStorage 优先，否则按系统偏好） */
export function getMode(): Mode {
  const saved = localStorage.getItem(MODE_KEY) as Mode | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** 应用主题到 <html data-theme> 并持久化 */
function apply(scheme: ColorScheme, mode: Mode): void {
  document.documentElement.setAttribute("data-theme", `${scheme}-${mode}`);
  localStorage.setItem(SCHEME_KEY, scheme);
  localStorage.setItem(MODE_KEY, mode);
  for (const cb of listeners) cb(scheme, mode);
}

/** 设置色系（保持当前明暗） */
export function applyColorScheme(scheme: ColorScheme): void {
  apply(scheme, getMode());
}

/** 设置明暗模式（保持当前色系） */
export function applyMode(mode: Mode): void {
  apply(getColorScheme(), mode);
}

/** 切换明暗（light ↔ dark） */
export function toggleMode(): Mode {
  const next: Mode = getMode() === "dark" ? "light" : "dark";
  applyMode(next);
  return next;
}

/** 初始化时根据 localStorage + 系统偏好应用主题 */
export function resolveAndApply(): void {
  apply(getColorScheme(), getMode());
}

/** 订阅主题变化，返回取消订阅函数 */
export function onThemeChange(cb: ThemeChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ============== 旧 API 兼容（app.ts 等仍在用） ==============
export type Theme = Mode;
export function resolveInitialTheme(): Theme {
  return getMode();
}
export function applyTheme(theme: Theme): void {
  applyMode(theme);
}
export function getTheme(): Theme {
  return getMode();
}
export function toggleTheme(): Theme {
  return toggleMode();
}
