// ESLint flat config (ESLint 9+)
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 忽略目录：构建产物、Rust 后端、依赖
  {
    ignores: ["dist/**", "node_modules/**", "src-tauri/**"],
  },

  // 基础推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // 项目源码
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
);
