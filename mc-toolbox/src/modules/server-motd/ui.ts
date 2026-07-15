// server-motd 模块 UI（MD3 风格）
// 使用 MD3 自定义组件类：md3-card / md3-input / md3-btn-* / md3-tabs / md3-segmented
// 所有可见文本走 t()，语言切换时通过 refresh() 更新

import { t, onLocaleChange } from "../../lang";
import {
  queryMotd,
  type Edition,
  type MotdResult,
  type MotdError,
} from "./commands";
import { parseColorCodes } from "./colors";

export interface MotdUi {
  refresh: () => void;
  destroy: () => void;
}

export function createUi(container: HTMLElement): MotdUi {
  let edition: Edition = "java";
  let querying = false;
  let lastResult: MotdResult | null = null;
  let lastError: MotdError | null = null;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-4">
      <!-- 查询表单：MD3 filled card -->
      <div class="md3-card-filled space-y-4">
        <!-- MD3 segmented buttons（Java/Bedrock 切换） -->
        <div class="md3-segmented w-full" id="motd-edition">
          <button class="md3-segmented-btn active" data-edition="java" data-i18n="modules.server-motd.edition.java"></button>
          <button class="md3-segmented-btn" data-edition="bedrock" data-i18n="modules.server-motd.edition.bedrock"></button>
        </div>
        <!-- MD3 outlined text field -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label class="text-xs text-base-content/60 block mb-1" data-i18n="modules.server-motd.input.host"></label>
            <input id="motd-host" type="text" class="md3-input" placeholder="" />
          </div>
          <div class="w-full sm:w-28">
            <label class="text-xs text-base-content/60 block mb-1" data-i18n="modules.server-motd.input.port"></label>
            <input id="motd-port" type="number" min="1" max="65535" class="md3-input" placeholder="" />
          </div>
        </div>
        <button id="motd-query-btn" class="md3-btn-filled w-full"></button>
      </div>

      <!-- 错误提示：MD3 filled card（error 颜色） -->
      <div id="motd-error" class="md3-card-filled hidden !bg-error/10 text-error"></div>

      <!-- 结果区 -->
      <div id="motd-result" class="hidden space-y-4">
        <!-- 描述卡片：MD3 filled card -->
        <div class="md3-card-filled">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-lg bg-base-300/50 flex items-center justify-center overflow-hidden flex-none">
              <img id="motd-favicon" class="hidden w-full h-full object-contain" alt="favicon" />
            </div>
            <div class="flex-1 min-w-0">
              <div id="motd-description" class="break-words leading-relaxed"></div>
              <div class="mt-2">
                <span class="badge badge-sm badge-ghost" id="motd-latency-badge"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计数据：MD3 filled card 三列 -->
        <div class="md3-card-filled grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-xs text-base-content/60 mb-1" data-i18n="modules.server-motd.result.players"></div>
            <div class="text-xl font-medium" id="motd-players-val"></div>
          </div>
          <div class="border-x border-base-300">
            <div class="text-xs text-base-content/60 mb-1" data-i18n="modules.server-motd.result.version"></div>
            <div class="text-xl font-medium truncate px-1" id="motd-version-val"></div>
          </div>
          <div>
            <div class="text-xs text-base-content/60 mb-1" data-i18n="modules.server-motd.result.latency"></div>
            <div class="text-xl font-medium" id="motd-latency-val"></div>
          </div>
        </div>

        <!-- 玩家列表：MD3 filled card -->
        <div class="md3-card-filled">
          <h3 class="text-sm font-medium mb-3" data-i18n="modules.server-motd.result.player-list"></h3>
          <div id="motd-player-list" class="flex flex-wrap gap-1.5"></div>
        </div>
      </div>
    </div>
  `;

  const editionTabs = qs<HTMLElement>(container, "#motd-edition");
  const hostInput = qs<HTMLInputElement>(container, "#motd-host");
  const portInput = qs<HTMLInputElement>(container, "#motd-port");
  const queryBtn = qs<HTMLButtonElement>(container, "#motd-query-btn");
  const errorBox = qs<HTMLElement>(container, "#motd-error");
  const resultBox = qs<HTMLElement>(container, "#motd-result");
  const favicon = qs<HTMLImageElement>(container, "#motd-favicon");
  const descEl = qs<HTMLElement>(container, "#motd-description");
  const latencyBadge = qs<HTMLElement>(container, "#motd-latency-badge");
  const playersVal = qs<HTMLElement>(container, "#motd-players-val");
  const versionVal = qs<HTMLElement>(container, "#motd-version-val");
  const latencyVal = qs<HTMLElement>(container, "#motd-latency-val");
  const playerList = qs<HTMLElement>(container, "#motd-player-list");

  function refresh(): void {
    container.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n!);
    });
    hostInput.placeholder = t("modules.server-motd.input.host.placeholder");
    portInput.placeholder = t("modules.server-motd.input.port.placeholder");
    queryBtn.textContent = querying
      ? t("modules.server-motd.input.querying")
      : t("modules.server-motd.input.query");
    queryBtn.disabled = querying;

    if (lastResult) renderResult(lastResult);
    if (lastError) renderError(lastError);
  }

  function setQuerying(v: boolean): void {
    querying = v;
    queryBtn.textContent = v
      ? t("modules.server-motd.input.querying")
      : t("modules.server-motd.input.query");
    queryBtn.disabled = v;
  }

  function renderError(err: MotdError): void {
    resultBox.classList.add("hidden");
    errorBox.classList.remove("hidden");
    const key = `modules.server-motd.error.${err.kind}`;
    const known = t(key);
    errorBox.textContent =
      known === key
        ? t("modules.server-motd.error.unknown", { message: err.message })
        : known;
  }

  function renderResult(r: MotdResult): void {
    errorBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    if (r.favicon) {
      favicon.src = r.favicon;
      favicon.classList.remove("hidden");
    } else {
      favicon.classList.add("hidden");
    }

    descEl.innerHTML = parseColorCodes(r.description);
    latencyBadge.textContent = `${r.edition.toUpperCase()} · ${r.latency_ms}${t("modules.server-motd.result.ms")}`;
    playersVal.textContent = `${r.online} / ${r.max}`;
    versionVal.textContent = r.version_name || `#${r.protocol}`;
    latencyVal.textContent = `${r.latency_ms}`;

    const sample = r.players ?? [];
    if (sample.length === 0) {
      playerList.innerHTML = `<span class="text-sm text-base-content/50">${escapeHtml(t("modules.server-motd.result.player-list.empty"))}</span>`;
    } else {
      playerList.innerHTML = sample
        .map(
          (p) => `<span class="badge badge-sm badge-outline">${escapeHtml(p.name)}</span>`,
        )
        .join("");
    }
  }

  async function doQuery(): Promise<void> {
    const host = hostInput.value.trim();
    if (!host) {
      renderError({ kind: "invalid-host", message: "empty host" });
      return;
    }
    const port = portInput.value ? Number(portInput.value) : null;
    setQuerying(true);
    try {
      const result = await queryMotd({ edition, host, port });
      lastResult = result;
      lastError = null;
      renderResult(result);
    } catch (e) {
      const err = e as MotdError;
      lastError =
        err && "kind" in err ? err : { kind: "unknown", message: String(e) };
      lastResult = null;
      renderError(lastError);
    } finally {
      setQuerying(false);
    }
  }

  editionTabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-edition]");
    if (!btn) return;
    edition = btn.dataset.edition as Edition;
    editionTabs
      .querySelectorAll(".md3-segmented-btn")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
  });

  queryBtn.addEventListener("click", () => void doQuery());
  hostInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void doQuery();
  });

  const offLocale = onLocaleChange(() => refresh());
  refresh();

  return {
    refresh,
    destroy() {
      offLocale();
    },
  };
}

function qs<T extends HTMLElement>(parent: ParentNode, sel: string): T {
  const el = parent.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
