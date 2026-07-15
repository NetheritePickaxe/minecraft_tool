// 跨模块事件总线
// - 模块间不得直接 import 对方内部实现，统一通过 emit/on 通信
// - 事件名使用 <scope>:<event> 格式，避免冲突（如 "mod-manager:installed"）

type EventHandler = (payload: unknown) => void;

const handlers = new Map<string, Set<EventHandler>>();

/** 订阅事件，返回取消订阅函数 */
export function on(event: string, handler: EventHandler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

/** 触发事件 */
export function emit(event: string, payload?: unknown): void {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[event-bus] handler error for "${event}":`, err);
    }
  }
}
