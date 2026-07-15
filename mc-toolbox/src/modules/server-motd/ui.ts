// server-motd 模块 UI：输入表单 + 结果展示 + 错误提示
// 所有可见文本走 t()，语言切换时通过 refresh() 更新静态文本

import { t, onLocaleChange } from "../../lang";
import {
  isTauri,
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
      <div id="motd-notauri" class="alert alert-warning hidden"></div>

      <div class="card bg-base-100 shadow">
        <div class="card-body gap-4">
          <div role="tablist" class="tabs tabs-boxed" id="motd-edition">
            <button role="tab" class="tab tab-active" data-edition="java" data-i18n="modules.server-motd.edition.java"></button>
            <button role="tab" class="tab" data-edition="bedrock" data-i18n="modules.server-motd.edition.bedrock"></button>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <label class="form-control flex-1">
              <span class="label-text mb-1" data-i18n="modules.server-motd.input.host"></span>
              <input id="motd-host" type="text" class="input input-bordered" placeholder="" />
            </label>
            <label class="form-control w-full sm:w-32">
              <span class="label-text mb-1" data-i18n="modules.server-motd.input.port"></span>
              <input id="motd-port" type="number" min="1" max="65535" class="input input-bordered" placeholder="" />
            </label>
          </div>
          <button id="motd-query-btn" class="btn btn-primary"></button>
        </div>
      </div>

      <div id="motd-error" class="alert alert-error hidden"></div>

      <div id="motd-result" class="hidden space-y-4">
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="flex items-start gap-4">
              <img id="motd-favicon" class="w-16 h-16 hidden" alt="favicon" />
              <div class="flex-1 min-w-0">
                <div id="motd-description" class="text-lg break-words"></div>
                <div class="mt-1">
                  <span class="badge badge-ghost" id="motd-latency-badge"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-100">
          <div class="stat">
            <div class="stat-title" data-i18n="modules.server-motd.result.players"></div>
            <div class="stat-value text-2xl" id="motd-players-val"></div>
          </div>
          <div class="stat">
            <div class="stat-title" data-i18n="modules.server-motd.result.version"></div>
            <div class="stat-value text-2xl" id="motd-version-val"></div>
          </div>
          <div class="stat">
            <div class="stat-title" data-i18n="modules.server-motd.result.latency"></div>
            <div class="stat-value text-2xl" id="motd-latency-val"></div>
          </div>
        </div>
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title text-base" data-i18n="modules.server-motd.result.player-list"></h3>
            <div id="motd-player-list" class="flex flex-wrap gap-2"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const notauri = qs<HTMLElement>(container, "#motd-notauri");
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

    if (!isTauri()) {
      notauri.classList.remove("hidden");
      notauri.textContent = t("modules.server-motd.error.unavailable-web");
      queryBtn.disabled = true;
    } else {
      notauri.classList.add("hidden");
    }

    // 刷新已有结果/错误的动态文本
    if (lastResult) renderResult(lastResult);
    if (lastError) renderError(lastError);
  }

  function setQuerying(v: boolean): void {
    querying = v;
    queryBtn.textContent = v
      ? t("modules.server-motd.input.querying")
      : t("modules.server-motd.input.query");
    queryBtn.disabled = v || !isTauri();
  }

  function renderError(err: MotdError): void {
    resultBox.classList.add("hidden");
    errorBox.classList.remove("hidden");
    const key = `modules.server-motd.error.${err.kind}`;
    const known = t(key);
    errorBox.innerHTML =
      known === key
        ? `<span>${escapeHtml(t("modules.server-motd.error.unknown", { message: err.message }))}</span>`
        : `<span>${escapeHtml(known)}</span>`;
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
      playerList.innerHTML = `<span class="text-sm opacity-60">${escapeHtml(t("modules.server-motd.result.player-list.empty"))}</span>`;
    } else {
      playerList.innerHTML = sample
        .map((p) => `<span class="badge badge-outline">${escapeHtml(p.name)}</span>`)
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
      lastError = err && "kind" in err ? err : { kind: "unknown", message: String(e) };
      lastResult = null;
      renderError(lastError);
    } finally {
      setQuerying(false);
    }
  }

  editionTabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-edition]');
    if (!btn) return;
    edition = btn.dataset.edition as Edition;
    editionTabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("tab-active"));
    btn.classList.add("tab-active");
  });

  queryBtn.addEventListener("click", doQuery);
  hostInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doQuery();
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
