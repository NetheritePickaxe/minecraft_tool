// 主题管理：直接使用 DaisyUI 全部内置主题 + 自定义 Minecraft 主题
// - 通过 <html data-theme="..."> 切换
// - 持久化到 localStorage
// - 支持系统自动跟随（light/dark/minecraft-dark）
// - 顶栏按钮在 light/dark 间快速切换；设置页可选择全部主题

export type Theme =
  | "light"
  | "dark"
  | "cupcake"
  | "bumblebee"
  | "emerald"
  | "corporate"
  | "synthwave"
  | "retro"
  | "cyberpunk"
  | "valentine"
  | "halloween"
  | "garden"
  | "forest"
  | "aqua"
  | "lofi"
  | "pastel"
  | "fantasy"
  | "wireframe"
  | "black"
  | "luxury"
  | "dracula"
  | "cmyk"
  | "autumn"
  | "business"
  | "acid"
  | "lemonade"
  | "night"
  | "coffee"
  | "winter"
  | "dim"
  | "nord"
  | "sunset"
  | "minecraft"
  | "minecraft-dark";

export const THEMES: Theme[] = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "minecraft",
  "minecraft-dark",
];

/** 主题对应的中文名 i18n 键 */
export const THEME_NAME_KEY: Record<Theme, string> = {
  light: "modules.settings.theme.name.light",
  dark: "modules.settings.theme.name.dark",
  cupcake: "modules.settings.theme.name.cupcake",
  bumblebee: "modules.settings.theme.name.bumblebee",
  emerald: "modules.settings.theme.name.emerald",
  corporate: "modules.settings.theme.name.corporate",
  synthwave: "modules.settings.theme.name.synthwave",
  retro: "modules.settings.theme.name.retro",
  cyberpunk: "modules.settings.theme.name.cyberpunk",
  valentine: "modules.settings.theme.name.valentine",
  halloween: "modules.settings.theme.name.halloween",
  garden: "modules.settings.theme.name.garden",
  forest: "modules.settings.theme.name.forest",
  aqua: "modules.settings.theme.name.aqua",
  lofi: "modules.settings.theme.name.lofi",
  pastel: "modules.settings.theme.name.pastel",
  fantasy: "modules.settings.theme.name.fantasy",
  wireframe: "modules.settings.theme.name.wireframe",
  black: "modules.settings.theme.name.black",
  luxury: "modules.settings.theme.name.luxury",
  dracula: "modules.settings.theme.name.dracula",
  cmyk: "modules.settings.theme.name.cmyk",
  autumn: "modules.settings.theme.name.autumn",
  business: "modules.settings.theme.name.business",
  acid: "modules.settings.theme.name.acid",
  lemonade: "modules.settings.theme.name.lemonade",
  night: "modules.settings.theme.name.night",
  coffee: "modules.settings.theme.name.coffee",
  winter: "modules.settings.theme.name.winter",
  dim: "modules.settings.theme.name.dim",
  nord: "modules.settings.theme.name.nord",
  sunset: "modules.settings.theme.name.sunset",
  minecraft: "modules.settings.theme.name.minecraft",
  "minecraft-dark": "modules.settings.theme.name.minecraft-dark",
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

