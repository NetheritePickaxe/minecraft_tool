// Minecraft § 颜色/格式代码解析为 HTML
// 将带 § 前缀的 legacy 字符串转为带内联样式的 <span> 序列

const COLOR_CODES: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

const FORMAT_CODES: Record<string, string> = {
  k: "obfuscated",
  l: "font-weight:bold",
  m: "text-decoration:line-through",
  n: "text-decoration:underline",
  o: "font-style:italic",
};

interface StyleState {
  color: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
}

function stateToStyle(s: StyleState): string {
  const parts: string[] = [];
  if (s.color) parts.push(`color:${s.color}`);
  if (s.bold) parts.push("font-weight:bold");
  if (s.italic) parts.push("font-style:italic");
  const deco: string[] = [];
  if (s.underline) deco.push("underline");
  if (s.strikethrough) deco.push("line-through");
  if (deco.length) parts.push(`text-decoration:${deco.join(" ")}`);
  return parts.join(";");
}

function freshState(): StyleState {
  return {
    color: null,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    obfuscated: false,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 将 § 代码字符串转为 HTML 字符串。
 * §r 重置所有格式；§ 后跟颜色码设颜色并重置格式码（MC 行为）。
 */
export function parseColorCodes(text: string): string {
  let state = freshState();
  let buffer = "";
  const segments: string[] = [];
  let i = 0;

  const flush = () => {
    if (buffer) {
      const cls = state.obfuscated ? ' class="mc-obfuscated"' : "";
      const style = stateToStyle(state);
      const styleAttr = style ? ` style="${style}"` : "";
      segments.push(`<span${styleAttr}${cls}>${escapeHtml(buffer)}</span>`);
      buffer = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === "§" && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();
      if (code === "r") {
        flush();
        state = freshState();
      } else if (code in COLOR_CODES) {
        flush();
        // 颜色码会重置格式码（Minecraft 标准行为）
        state = freshState();
        state.color = COLOR_CODES[code];
      } else if (code in FORMAT_CODES) {
        flush();
        if (code === "k") state.obfuscated = true;
        if (code === "l") state.bold = true;
        if (code === "o") state.italic = true;
        if (code === "n") state.underline = true;
        if (code === "m") state.strikethrough = true;
      } else {
        // 未知代码，原样保留 §
        buffer += ch;
      }
      i += 2;
    } else {
      buffer += ch;
      i += 1;
    }
  }
  flush();
  return segments.join("");
}
