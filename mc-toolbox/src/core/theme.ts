// 主题管理：直接使用 DaisyUI 全部 35 个内置主题
// - 通过 <html data-theme="..."> 切换
// - 持久化到 localStorage
// - 顶栏按钮在 light/dark 间快速切换；设置页可选择全部主题
//
// 圆角定制（参考 DaisyUI 主题的 --radius-box/field/selector）：
// - 通过覆盖 <html> 的 CSS 变量实时生效
// - 三档：none (0) / sm (0.25rem) / md (0.5rem) / lg (1rem)

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
  | "caramellatte"
  | "abyss"
  | "silk";

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
  "caramellatte",
  "abyss",
  "silk",
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
  caramellatte: "modules.settings.theme.name.caramellatte",
  abyss: "modules.settings.theme.name.abyss",
  silk: "modules.settings.theme.name.silk",
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

/** 初始化时根据 localStorage + 系统偏好应用主题与圆角 */
export function resolveAndApply(): void {
  applyTheme(getTheme());
  applyRadius(getRadius());
}

/** 订阅主题变化，返回取消订阅函数 */
export function onThemeChange(cb: ThemeChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ============== 圆角定制（参考 DaisyUI --radius-* 变量） ==============

export type RadiusLevel = "none" | "sm" | "md" | "lg" | "xl";

/** 三类圆角，对应 DaisyUI 的 --radius-box / --radius-field / --radius-selector */
export type RadiusKey = "box" | "field" | "selector";

export const RADIUS_LEVELS: RadiusLevel[] = ["none", "sm", "md", "lg", "xl"];

export const RADIUS_VALUE: Record<RadiusLevel, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
  xl: "2rem",
};

const RADIUS_CSS_VAR: Record<RadiusKey, string> = {
  box: "--radius-box",
  field: "--radius-field",
  selector: "--radius-selector",
};

const RADIUS_KEY = "mc-toolbox.radius";

type RadiusSettings = Record<RadiusKey, RadiusLevel>;

type RadiusChangeCallback = (settings: RadiusSettings) => void;
const radiusListeners = new Set<RadiusChangeCallback>();

/** 读取圆角设置（缺省时按 md/md/sm 给一个温和默认值） */
export function getRadius(): RadiusSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(RADIUS_KEY) ?? "",
    ) as Partial<RadiusSettings>;
    return {
      box: validLevel(saved.box, "md"),
      field: validLevel(saved.field, "md"),
      selector: validLevel(saved.selector, "sm"),
    };
  } catch {
    return { box: "md", field: "md", selector: "sm" };
  }
}

function validLevel(v: unknown, fallback: RadiusLevel): RadiusLevel {
  return v && RADIUS_LEVELS.includes(v as RadiusLevel)
    ? (v as RadiusLevel)
    : fallback;
}

/** 应用圆角设置到 <html> CSS 变量并持久化 */
export function applyRadius(settings: RadiusSettings): void {
  const el = document.documentElement;
  (Object.keys(settings) as RadiusKey[]).forEach((key) => {
    el.style.setProperty(RADIUS_CSS_VAR[key], RADIUS_VALUE[settings[key]]);
  });
  localStorage.setItem(RADIUS_KEY, JSON.stringify(settings));
  for (const cb of radiusListeners) cb(settings);
}

/** 设置某一类圆角 */
export function applyRadiusLevel(key: RadiusKey, level: RadiusLevel): void {
  const next = { ...getRadius(), [key]: level };
  applyRadius(next);
}

/** 订阅圆角变化 */
export function onRadiusChange(cb: RadiusChangeCallback): () => void {
  radiusListeners.add(cb);
  return () => radiusListeners.delete(cb);
}
