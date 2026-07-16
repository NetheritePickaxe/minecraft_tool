// i18n 基础设施
// - 平铺 JSON + 点分命名空间
// - zh_cn 为默认/回退语言
// - 语言选择持久化到 localStorage
// - 支持 {var} 插值

import zhCn from "./locales/zh_cn.json";
import enUs from "./locales/en_us.json";

export type LocaleCode = "zh_cn" | "en_us";

const LOCALES: Record<LocaleCode, Record<string, string>> = {
  zh_cn: zhCn,
  en_us: enUs,
};

const STORAGE_KEY = "mc-toolbox.locale";
const FALLBACK: LocaleCode = "zh_cn";

let currentLocale: LocaleCode = resolveInitialLocale();

type LocaleChangeCallback = (locale: LocaleCode) => void;
const listeners = new Set<LocaleChangeCallback>();

/** 根据浏览器语言与 localStorage 确定初始语言 */
function resolveInitialLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in LOCALES) {
    return saved as LocaleCode;
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("zh")) return "zh_cn";
  if (nav.startsWith("en")) return "en_us";
  return FALLBACK;
}

/**
 * 翻译键值，支持 {var} 插值。
 * 当前语言缺失时回退到 zh_cn；仍缺失则返回 key 本身。
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = LOCALES[currentLocale][key] ?? LOCALES[FALLBACK][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** 当前语言 */
export function getLocale(): LocaleCode {
  return currentLocale;
}

/** 切换语言并持久化，触发所有订阅回调 */
export function setLocale(locale: LocaleCode): void {
  if (locale === currentLocale || !(locale in LOCALES)) return;
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.setAttribute("lang", locale.replace("_", "-"));
  for (const cb of listeners) cb(locale);
}

/** 订阅语言变化，返回取消订阅函数 */
export function onLocaleChange(cb: LocaleChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 初始化 <html lang> 属性 */
export function initLocale(): void {
  document.documentElement.setAttribute(
    "lang",
    currentLocale.replace("_", "-"),
  );
}
