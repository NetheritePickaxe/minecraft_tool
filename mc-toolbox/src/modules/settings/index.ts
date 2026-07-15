// settings 模块入口
// 系统模块：不显示在卡片墙，仅通过底边栏入口进入
// 包含：语言 / 主题 / 链接区 / 版本号 / 检测更新 / 应用内更新

import type { ModuleRegistration } from "../../core/types";
import { createUi, type SettingsUi } from "./ui";

let currentUi: SettingsUi | null = null;

export function register(): ModuleRegistration {
  return {
    id: "settings",
    nameKey: "modules.settings.name",
    icon: "settings",
    system: true,
    mount(container) {
      currentUi = createUi(container);
    },
    unmount() {
      currentUi?.destroy();
      currentUi = null;
    },
  };
}
