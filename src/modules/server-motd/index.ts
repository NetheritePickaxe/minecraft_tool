// server-motd 模块入口
// MOTD 查询：输入服务器地址，展示描述/人数/版本/图标/玩家列表

import type { ModuleRegistration } from "../../core/types";
import { createUi, type MotdUi } from "./ui";

// 模块级引用，用于 unmount 时释放语言订阅
let currentUi: MotdUi | null = null;

export function register(): ModuleRegistration {
  return {
    id: "server-motd",
    nameKey: "modules.server-motd.name",
    descriptionKey: "modules.server-motd.description",
    icon: "satellite-dish",
    category: "server",
    mount(container) {
      currentUi = createUi(container);
    },
    unmount() {
      currentUi?.destroy();
      currentUi = null;
    },
  };
}
