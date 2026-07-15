// MC 工具箱 - 前端入口
// 挂载应用框架到 #app

import { mountApp } from "./app";

const root = document.getElementById("app");
if (!root) {
  throw new Error("#app root element not found");
}

mountApp(root).catch((err) => {
  console.error("Failed to mount app:", err);
});
