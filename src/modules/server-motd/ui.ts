// server-motd 模块 UI
// 纯 DaisyUI 组件：card / tabs tabs-boxed / form-control / input input-bordered / btn / alert / stats / badge / avatar

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
      <!-- 查询表单：card -->
      <div class="card bg-base-100 rounded-2xl shadow-sm">
        <div class="card-body gap-4">
          <!-- 版本切换：tabs tabs-boxed -->
          <div role="tablist" class="tabs tabs-boxed bg-base-200" id="motd-edition">
            <a role="tab" class="tab tab-active" data-edition="java" data-i18n="modules.server-motd.edition.java"></a>
            <a role="tab" class="tab" data-edition="bedrock" data-i18n="modules.server-motd.edition.bedrock"></a>
          </div>
          <!-- 输入：form-control + input input-bordered（支持 host / host:port / [ipv6]:port） -->
          <label class="form-control">
            <div class="label py-1">
              <span class="label-text" data-i18n="modules.server-motd.input.host"></span>
            </div>
            <input id="motd-host" type="text" class="input input-bordered input-sm" placeholder="" />
          </label>
          <!-- 查询按钮：btn btn-primary -->
          <button id="motd-query-btn" class="btn btn-primary btn-sm"></button>
        </div>
      </div>

      <!-- 错误提示：alert alert-error -->
      <div id="motd-error" class="alert alert-error hidden"></div>

      <!-- 结果区 -->
      <div id="motd-result" class="hidden space-y-4">
        <!-- 描述卡片：card -->
        <div class="card bg-base-100 rounded-2xl shadow-sm">
          <div class="card-body">
            <div class="flex items-start gap-3">
              <div class="avatar flex-none">
                <div class="w-14 rounded-lg bg-base-200 flex items-center justify-center overflow-hidden">
                  <img id="motd-favicon" class="hidden w-full h-full object-contain" alt="favicon" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div id="motd-description" class="break-words"></div>
                <div class="mt-2">
                  <span class="badge badge-ghost badge-sm" id="motd-latency-badge"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计数据：stats -->
        <div class="stats stats-vertical sm:stats-horizontal shadow-sm bg-base-100 w-full">
          <div class="stat">
            <div class="stat-title text-xs" data-i18n="modules.server-motd.result.players"></div>
            <div class="stat-value text-lg" id="motd-players-val"></div>
          </div>
          <div class="stat">
            <div class="stat-title text-xs" data-i18n="modules.server-motd.result.version"></div>
            <div class="stat-value text-lg" id="motd-version-val"></div>
          </div>
          <div class="stat">
            <div class="stat-title text-xs" data-i18n="modules.server-motd.result.latency"></div>
            <div class="stat-value text-lg" id="motd-latency-val"></div>
          </div>
        </div>

        <!-- 玩家列表：card -->
        <div class="card bg-base-100 rounded-2xl shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-base" data-i18n="modules.server-motd.result.player-list"></h3>
            <div id="motd-player-list" class="flex flex-wrap gap-1.5"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const editionTabs = qs<HTMLElement>(container, "#motd-edition");
  const hostInput = qs<HTMLInputElement>(container, "#motd-host");
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
        .map(
          (p) => `<span class="badge badge-outline badge-sm">${escapeHtml(p.name)}</span>`,
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
    setQuerying(true);
    try {
      // port 传 null，后端 mod.rs 会从 host 字段解析 host:port
      const result = await queryMotd({ edition, host, port: null });
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
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("tab-active"));
    btn.classList.add("tab-active");
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
