// 主题管理：DaisyUI 内置主题 + 自定义主题
// - 通过 <html data-theme="..."> 切换
// - 持久化到 localStorage
// - 支持三种模式：浅色 / 深色 / 跟随系统
// - 用户可设定默认浅色主题和默认深色主题
// - 支持自定义主题（通过 CSS 变量注入）

// ============== 主题类型 ==============

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
  | "custom";

/** 所有内置主题（不含 custom） */
export const THEMES: Theme[] = [
  "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
  "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
  "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe",
  "black", "luxury", "dracula", "cmyk", "autumn", "business",
  "acid", "lemonade", "night", "coffee", "winter", "dim",
  "nord", "sunset",
];

/** 浅色主题 */
export const LIGHT_THEMES: Theme[] = [
  "light", "cupcake", "bumblebee", "emerald", "corporate", "valentine",
  "garden", "lofi", "pastel", "fantasy", "wireframe", "autumn",
  "lemonade", "winter", "nord", "retro",
];

/** 深色主题 */
export const DARK_THEMES: Theme[] = [
  "dark", "synthwave", "cyberpunk", "halloween", "forest", "aqua",
  "black", "luxury", "dracula", "cmyk", "business", "acid",
  "night", "coffee", "dim", "sunset",
];

/** 主题是浅色还是深色 */
export function isLightTheme(theme: Theme): boolean {
  if (theme === "custom") return getCustomTheme()?.mode === "light";
  return LIGHT_THEMES.includes(theme);
}

/** 主题对应的中文名 i18n 键 */
export const THEME_NAME_KEY: Record<Exclude<Theme, "custom">, string> = {
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
};

// ============== 主题模式 ==============

export type ThemeMode = "light" | "dark" | "auto";

const MODE_KEY = "mc-toolbox.theme-mode";
const DEFAULT_LIGHT_KEY = "mc-toolbox.theme-light";
const DEFAULT_DARK_KEY = "mc-toolbox.theme-dark";

/** 获取当前主题模式 */
export function getThemeMode(): ThemeMode {
  const saved = localStorage.getItem(MODE_KEY) as ThemeMode | null;
  if (saved === "light" || saved === "dark" || saved === "auto") return saved;
  return "auto";
}

/** 设置主题模式并应用 */
export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(MODE_KEY, mode);
  applyActiveTheme();
  notifyListeners();
}

/** 获取默认浅色主题 */
export function getDefaultLightTheme(): Theme {
  const saved = localStorage.getItem(DEFAULT_LIGHT_KEY) as Theme | null;
  if (saved && (THEMES.includes(saved) || saved === "custom")) return saved;
  return "light";
}

/** 设置默认浅色主题并应用 */
export function setDefaultLightTheme(theme: Theme): void {
  localStorage.setItem(DEFAULT_LIGHT_KEY, theme);
  applyActiveTheme();
  notifyListeners();
}

/** 获取默认深色主题 */
export function getDefaultDarkTheme(): Theme {
  const saved = localStorage.getItem(DEFAULT_DARK_KEY) as Theme | null;
  if (saved && (THEMES.includes(saved) || saved === "custom")) return saved;
  return "dark";
}

/** 设置默认深色主题并应用 */
export function setDefaultDarkTheme(theme: Theme): void {
  localStorage.setItem(DEFAULT_DARK_KEY, theme);
  applyActiveTheme();
  notifyListeners();
}

// ============== 当前活跃主题 ==============

/** 系统是否偏好深色 */
function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** 根据模式和默认设置获取当前应该使用的主题 */
export function getTheme(): Theme {
  const mode = getThemeMode();
  if (mode === "light") return getDefaultLightTheme();
  if (mode === "dark") return getDefaultDarkTheme();
  // auto
  return systemPrefersDark() ? getDefaultDarkTheme() : getDefaultLightTheme();
}

/** 应用当前活跃主题到 <html data-theme> */
export function applyActiveTheme(): void {
  // 确保自定义主题 CSS 已注入
  if (getTheme() === "custom" || getDefaultLightTheme() === "custom" || getDefaultDarkTheme() === "custom") {
    applyCustomThemeCss();
  }
  const theme = getTheme();
  document.documentElement.setAttribute("data-theme", theme);
}

/** 初始化时应用主题 */
export function resolveAndApply(): void {
  applyCustomThemeCss();
  applyActiveTheme();
  // 监听系统主题变化
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemeMode() === "auto") {
      applyActiveTheme();
      notifyListeners();
    }
  });
}

// ============== 兼容旧 API ==============

/** 直接应用指定主题（不经过模式系统，用于快速切换） */
export function applyTheme(theme: Theme): void {
  // 直接应用意味着用户选择了这个主题
  // 根据主题是浅色还是深色来设置模式和默认值
  if (isLightTheme(theme)) {
    setDefaultLightTheme(theme);
    if (getThemeMode() === "dark") setThemeMode("light");
  } else {
    setDefaultDarkTheme(theme);
    if (getThemeMode() === "light") setThemeMode("dark");
  }
}

/** 顶栏快速切换：在浅色/深色之间切换 */
export function toggleMode(): ThemeMode {
  const current = getThemeMode();
  const next: ThemeMode = current === "light" ? "dark" : "light";
  setThemeMode(next);
  return next;
}

// ============== 事件订阅 ==============

type ThemeChangeCallback = () => void;
const listeners = new Set<ThemeChangeCallback>();

export function onThemeChange(cb: ThemeChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(): void {
  for (const cb of listeners) cb();
}

// ============== 自定义主题 ==============

export interface CustomThemeConfig {
  mode: "light" | "dark";
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  base100: string;
  baseContent: string;
}

const CUSTOM_THEME_KEY = "mc-toolbox.custom-theme";

const DEFAULT_CUSTOM: CustomThemeConfig = {
  mode: "light",
  primary: "#5d9e38",
  secondary: "#8b6914",
  accent: "#c41e3a",
  neutral: "#707070",
  base100: "#c6c6c6",
  baseContent: "#2b2b2b",
};

export { DEFAULT_CUSTOM };

/** 获取自定义主题配置 */
export function getCustomTheme(): CustomThemeConfig | null {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY) ?? "");
    if (saved && typeof saved.primary === "string") {
      return { ...DEFAULT_CUSTOM, ...saved };
    }
  } catch {
    // ignore
  }
  return null;
}

/** 保存自定义主题配置并应用 */
export function setCustomTheme(config: CustomThemeConfig): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(config));
  applyCustomThemeCss();
  applyActiveTheme();
  notifyListeners();
}

/** 判断主题是否为自定义 */
export function isCustomTheme(theme: Theme): boolean {
  return theme === "custom";
}

/** hex 转 OKLCH 分量（DaisyUI v4 格式：L% C H） */
function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB → linear RGB
  const lr = r <= 0.04045 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const lg = g <= 0.04045 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const lb = b <= 0.04045 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

  // linear RGB → LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // LMS → L'M'S'（立方根）
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // L'M'S' → OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bLab * bLab);
  let H = (Math.atan2(bLab, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${H.toFixed(2)}`;
}

/** 计算对比文字色（黑或白） */
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

/** 使颜色变暗 */
function darken(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** 将自定义主题注入为 CSS */
export function applyCustomThemeCss(): void {
  const config = getCustomTheme();
  if (!config) return;

  const styleId = "mc-toolbox-custom-theme";
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }

  const p = hexToOklch(config.primary);
  const pc = hexToOklch(contrastColor(config.primary));
  const s = hexToOklch(config.secondary);
  const sc = hexToOklch(contrastColor(config.secondary));
  const a = hexToOklch(config.accent);
  const ac = hexToOklch(contrastColor(config.accent));
  const n = hexToOklch(config.neutral);
  const nc = hexToOklch(contrastColor(config.neutral));
  const b1 = hexToOklch(config.base100);
  const b2 = hexToOklch(darken(config.base100, 0.07));
  const b3 = hexToOklch(darken(config.base100, 0.14));
  const bc = hexToOklch(config.baseContent);

  style.textContent = `
    [data-theme="custom"] {
      color-scheme: ${config.mode};
      --p: ${p};
      --pc: ${pc};
      --s: ${s};
      --sc: ${sc};
      --a: ${a};
      --ac: ${ac};
      --n: ${n};
      --nc: ${nc};
      --b1: ${b1};
      --b2: ${b2};
      --b3: ${b3};
      --bc: ${bc};
      --in: ${hexToOklch("#4a90d9")};
      --inc: ${hexToOklch("#ffffff")};
      --su: ${hexToOklch("#5d9e38")};
      --suc: ${hexToOklch("#ffffff")};
      --wa: ${hexToOklch("#d4a017")};
      --wac: ${hexToOklch("#ffffff")};
      --er: ${hexToOklch("#c41e3a")};
      --erc: ${hexToOklch("#ffffff")};
    }
  `;
}

// ============== 读取主题颜色 ==============

/** rgb()/rgba() 字符串转 #hex */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#000000";
  const r = Math.round(parseFloat(m[0]));
  const g = Math.round(parseFloat(m[1]));
  const b = Math.round(parseFloat(m[2]));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * 读取任意主题的实际渲染颜色。
 * 通过临时挂载带 data-theme 的探测元素，读取 bg-primary 等类的计算样式。
 */
export function readThemeColors(theme: Theme): CustomThemeConfig {
  if (theme === "custom") {
    const saved = getCustomTheme();
    if (saved) return saved;
  }

  const probe = document.createElement("div");
  probe.setAttribute("data-theme", theme === "custom" ? "light" : theme);
  probe.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden";
  probe.innerHTML =
    '<span class="bg-primary"></span>' +
    '<span class="bg-secondary"></span>' +
    '<span class="bg-accent"></span>' +
    '<span class="bg-neutral"></span>' +
    '<span class="bg-base-100"></span>' +
    '<span class="text-base-content"></span>';
  document.body.appendChild(probe);
  const spans = probe.querySelectorAll("span");
  const result: CustomThemeConfig = {
    mode: isLightTheme(theme) ? "light" : "dark",
    primary: rgbToHex(getComputedStyle(spans[0]).backgroundColor),
    secondary: rgbToHex(getComputedStyle(spans[1]).backgroundColor),
    accent: rgbToHex(getComputedStyle(spans[2]).backgroundColor),
    neutral: rgbToHex(getComputedStyle(spans[3]).backgroundColor),
    base100: rgbToHex(getComputedStyle(spans[4]).backgroundColor),
    baseContent: rgbToHex(getComputedStyle(spans[5]).color),
  };
  document.body.removeChild(probe);
  return result;
}
