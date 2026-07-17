// 布局偏好：底边栏样式等
// 持久化到 localStorage，支持事件订阅

export type NavStyle = "normal" | "floating";

const NAV_STYLE_KEY = "mc-toolbox.nav-style";

/** 获取底边栏样式（默认 normal） */
export function getNavStyle(): NavStyle {
  const saved = localStorage.getItem(NAV_STYLE_KEY) as NavStyle | null;
  if (saved === "normal" || saved === "floating") return saved;
  return "normal";
}

/** 设置底边栏样式并通知监听者 */
export function setNavStyle(style: NavStyle): void {
  localStorage.setItem(NAV_STYLE_KEY, style);
  notifyListeners();
}

// ============== 事件订阅 ==============

type NavStyleChangeCallback = (style: NavStyle) => void;
const listeners = new Set<NavStyleChangeCallback>();

export function onNavStyleChange(cb: NavStyleChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(): void {
  const style = getNavStyle();
  for (const cb of listeners) cb(style);
}
