// 模块注册与加载
// - register() 由各模块入口调用，收集到注册表
// - activate() 在内容区容器内挂载指定模块，自动卸载上一个模块

import type { ModuleRegistration } from "./types";

const registry = new Map<string, ModuleRegistration>();
const loaderEntries: Array<() => Promise<{ register: () => ModuleRegistration }>> = [];

let activeModule: ModuleRegistration | null = null;
let activeContainer: HTMLElement | null = null;

/**
 * 声明一个模块的懒加载入口。
 * 在 app.ts 中按顺序声明，模块不会立即加载，直到首次被激活。
 */
export function declareModule(
  loader: () => Promise<{ register: () => ModuleRegistration }>,
): void {
  loaderEntries.push(loader);
}

/** 异步加载并注册所有已声明模块，返回按声明顺序排列的注册信息 */
export async function loadAllModules(): Promise<ModuleRegistration[]> {
  const modules: ModuleRegistration[] = [];
  for (const loader of loaderEntries) {
    const mod = await loader();
    const reg = mod.register();
    if (registry.has(reg.id)) {
      console.warn(`[module-loader] duplicate module id: ${reg.id}`);
    }
    registry.set(reg.id, reg);
    modules.push(reg);
  }
  return modules;
}

/** 在内容区容器内激活指定模块，自动卸载上一个 */
export function activateModule(id: string, container: HTMLElement): void {
  const target = registry.get(id);
  if (!target) {
    console.error(`[module-loader] module not found: ${id}`);
    return;
  }
  if (activeModule === target) return;
  if (activeModule?.unmount) activeModule.unmount();
  container.innerHTML = "";
  activeModule = target;
  activeContainer = container;
  target.mount(container);
}

/** 卸载当前激活的模块 */
export function deactivateActive(): void {
  if (activeModule?.unmount) activeModule.unmount();
  if (activeContainer) activeContainer.innerHTML = "";
  activeModule = null;
  activeContainer = null;
}
