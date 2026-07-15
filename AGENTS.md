# AGENTS.md

本文件为 AI 代理（以及人类协作者）提供项目开发规范。**开始任何模块/功能开发前必读**。

---

## 1. 项目概况

- **名称**：MC Toolbox（MC 工具箱）—— Minecraft 工具箱
- **技术栈**：Tauri v2（Rust 后端）+ Vanilla TypeScript + Vite（前端）
- **支持平台**：Web、Windows、Android（三端共用同一套前端代码）
- **仓库**：`NetheritePickaxe/minecraft_tool`
- **项目根**：仓库下的 `mc-toolbox/` 子目录

---

## 2. 目录结构

```
minecraft_tool/                  # 仓库根
├── AGENTS.md                    # 本文件
├── .github/workflows/           # CI 工作流（build / lint / deploy-web）
└── mc-toolbox/                  # 应用代码根
    ├── src/                     # 前端源码
    │   ├── main.ts              # 前端入口
    │   ├── styles.css           # 全局样式
    │   ├── i18n/                # i18n 基础设施 + 语言文件
    │   │   ├── index.ts         # t() / 语言切换 / 持久化
    │   │   └── locales/         # 语言 JSON 文件
    │   │       ├── zh_cn.json
    │   │       └── en_us.json
    │   └── modules/             # 各功能模块（见下）
    │       └── <module-name>/   # 每个工具/功能一个文件夹
    ├── src-tauri/               # Rust 后端
    └── ...                      # 其它配置（package.json、vite.config.ts 等）
```

---

## 3. 模块化开发规范【强制】

### 3.1 核心原则

**每个工具/功能必须在 `mc-toolbox/src/modules/<module-name>/` 下独立开发**，禁止把多个功能的代码混写进 `main.ts` 或全局文件。

### 3.2 模块目录结构

一个模块的标准结构：

```
src/modules/<module-name>/
├── index.ts            # 模块入口：导出 register()，供主框架加载
├── ui.ts               # 该模块的 DOM 构建与事件绑定（可选，简单模块可合并到 index.ts）
├── <module>.scss       # 模块私有样式（可选）
└── README.md           # 模块说明（可选，仅复杂模块需要）
```

模块的语言文件**不放在模块目录内**，统一放 `src/i18n/locales/`（见第 4 节），按命名空间区分。

### 3.3 模块命名

- 使用小写 `kebab-case`：`mod-manager`、`save-manager`、`server-launcher`
- 命名反映功能领域，不反映实现方式（用 `mod-manager` 不用 `mod-list-component`）

### 3.4 模块注册

主框架（`src/main.ts` 或未来的 `src/app.ts`）通过统一接口加载各模块。每个模块入口需导出一个符合以下契约的函数：

```typescript
// src/modules/<module-name>/index.ts
export interface ModuleRegistration {
  id: string;                 // 唯一标识，与目录名一致
  nameKey: string;            // i18n 键，用于侧边栏/菜单显示
  mount(container: HTMLElement): void;  // 挂载到宿主容器
  unmount?(): void;           // 可选：卸载时清理（移除监听、定时器等）
}

export function register(): ModuleRegistration {
  return {
    id: '<module-name>',
    nameKey: 'modules.<module-name>.name',
    mount(container) { /* ... */ },
  };
}
```

### 3.5 模块间通信

- 模块之间**不得直接 import**对方的内部实现
- 跨模块交互通过主框架提供的事件总线或共享服务（待该机制实现后补充）
- 暂时允许通过 `window` 上挂载的约定对象通信，但需在模块 README 注明

### 3.6 新模块开发流程【强制】

**每次开发新模块前，必须先向用户提问确认，得到明确答复后再开始。** 问题至少覆盖：

1. 模块功能范围与边界
2. 模块 `id` 与目录名
3. 是否需要 Rust 后端命令（Tauri command）
4. 需要哪些权限（capabilities）

不得在用户未确认前自行创建模块目录或写入模块代码。

---

## 4. i18n 规范

### 4.1 支持语言

| 代码       | 语言     | 文件                     |
|------------|----------|--------------------------|
| `zh_cn`    | 简体中文 | `src/i18n/locales/zh_cn.json`（默认/回退） |
| `en_us`    | 英语     | `src/i18n/locales/en_us.json` |

- **`zh_cn` 为默认语言与回退语言**：当某键在当前语言缺失时，回退到 `zh_cn`
- 文件名一律用小写 + 下划线，与上表一致

### 4.2 语言文件格式

JSON 平铺式 + 点分命名空间，键名按 `<scope>.<...>.<field>` 组织：

```json
{
  "app.title": "MC 工具箱",
  "app.tagline": "功能开发中…",
  "modules.mod-manager.name": "Mod 管理",
  "modules.mod-manager.actions.install": "安装",
  "common.confirm": "确认",
  "common.cancel": "取消"
}
```

### 4.3 使用方式

通过 `src/i18n/index.ts` 提供的 `t()` 函数取值：

```typescript
import { t } from '../i18n';

const label = t('modules.mod-manager.name');
```

- **禁止在前端硬编码中文/英文字符串**，所有可见文本必须走 `t()`
- HTML 静态文本（如 `index.html` 的标题）也应在 `main.ts` 中用 `t()` 覆盖，或在后续框架改造时统一处理

### 4.4 语言切换

- `src/i18n/index.ts` 提供 `setLocale(code)` / `getLocale()` / `onLocaleChange(cb)`
- 语言选择持久化到 `localStorage`，键名 `mc-toolbox.locale`
- 首次访问根据 `navigator.language` 检测，匹配不到则回退 `zh_cn`

### 4.5 新增 i18n 键的流程

1. **同时**在 `zh_cn.json` 和 `en_us.json` 中添加该键
2. 如果暂无英文译文，先写占位（可暂用中文并标注 `// TODO: en`），但键必须存在以避免回退混乱
3. 键名遵循既有命名空间，新模块使用 `modules.<module-name>.*`

---

## 5. 代码风格

### 5.1 前端（TypeScript）

- ESLint 9 flat config，配置见 `mc-toolbox/eslint.config.js`
- 缩进 2 空格，分号可省略（遵循现有文件风格）
- 提交前运行 `npm run lint`

### 5.2 后端（Rust）

- `cargo fmt --check`（配置 `src-tauri/rustfmt.toml`：4 空格、max_width 100、Unix 换行）
- `cargo clippy --all-targets -- -D warnings` 必须 0 warning
- 公共函数与复杂逻辑需有文档注释

---

## 6. 提交与 CI

### 6.1 CI 工作流（`.github/workflows/`）

| 文件             | 作用                              | 触发                                  |
|------------------|-----------------------------------|---------------------------------------|
| `build.yml`      | 构建 Windows + Android，tag 时发布 Release | push tag `v*` / PR / 手动            |
| `lint.yml`       | ESLint + cargo fmt + cargo clippy | push main / PR / 手动                |
| `deploy-web.yml` | 构建前端部署 GitHub Pages          | push main / 手动（PR 仅构建不部署）   |

### 6.2 提交信息

- 使用中文，格式：`<type>(<scope>): <subject>`，例如 `feat(mod-manager): 新增 Mod 管理模块`
- `type`：`feat` / `fix` / `ci` / `docs` / `refactor` / `chore`
- `scope`：模块名或 `ci` / `i18n` / `deps` 等

### 6.3 PR 流程

- PR 目标分支为 `main`
- PR 必须通过 `lint` 与 `build` 两套 CI 才可合并
- Web 端在 PR 上会自动构建但**不会部署**（部署仅在 push main 或手动触发时）

---

## 7. 版本与发布

- 版本号统一在 `mc-toolbox/src-tauri/tauri.conf.json` 的 `version` 字段维护
- 打 tag 前先更新该字段，tag 格式 `v<version>`（如 `v0.0.1-dev`）
- Release 由 `build.yml` 在 tag 推送时自动创建，包含：
  - Windows：`<ProductName>_<version>_x64-setup.exe`、`<ProductName>_<version>_x64.msi`
  - Android：`mc-toolbox-<version>-<abi>.apk`（`arm64-v8a` / `armeabi-v7a` / `x86_64`）

---

## 8. 待办与已知约定

- i18n 基础设施（`src/i18n/index.ts` 与语言文件）**尚未实现**，将在首个需要 UI 文本的模块开发时一并落地
- 主框架（模块加载/侧边栏/路由）**尚未实现**，当前 `main.ts` 仅为占位
- 上述两项落地前，新模块开发需先与用户对齐基础设施是否同步搭建
