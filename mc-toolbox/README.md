# MC 工具箱

基于 Tauri v2 的 Minecraft 工具箱，支持 Web、Windows、Android 三端，通过 GitHub Actions 自动构建。

## 技术栈

- **前端**：Vanilla TypeScript + Vite
- **后端**：Rust + Tauri v2
- **CI**：GitHub Actions（三端构建）

## 本地开发

```bash
npm install
npm run tauri dev
```

> Linux 上首次编译需安装系统依赖：
> ```bash
> sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
>   libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
> ```

### Android 本地开发

需先安装 Android Studio（含 SDK + NDK 27），然后：

```bash
npm run tauri android init   # 首次初始化
npm run tauri android dev    # 连接设备/模拟器运行
```

## CI 构建说明

仓库内置两个 workflow：

### 1. `deploy-web.yml` — Web 端

- **触发**：推送到 `main` 分支，或手动
- **产物**：部署到 GitHub Pages `https://<user>.github.io/<repo>/`
- **前置条件**：仓库 Settings → Pages → Source 选择 **GitHub Actions**

### 2. `build.yml` — Windows + Android

- **触发**：推送 `v*` tag，或手动 (workflow_dispatch)
- **产物**：
  - Windows：`.msi` / `.exe` (NSIS)
  - Android：`.apk`（默认 debug 签名，可直接安装测试）
- **Release**：tag 触发时自动创建 GitHub Release 并附带所有产物

```bash
# 发布新版本（触发 Windows + Android 构建并发布 Release）
git tag v0.1.0
git push origin v0.1.0
```

### Android 正式签名（可选）

默认 CI 产出 debug 签名的 APK。如需发布到应用商店，配置以下 Secrets 后修改 `.github/workflows/build.yml` 中的构建步骤：

1. 生成 keystore：
   ```bash
   keytool -genkey -v -keystore release.keystore -alias mctoolbox -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore  # 复制输出
   ```
2. 在仓库 Settings → Secrets and variables → Actions 添加：
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
   - `ANDROID_STORE_PASSWORD`
3. 将 `build.yml` 中的构建命令从 `--debug` 改为正式签名构建。

## 项目结构

```
mc-toolbox/
├── .github/workflows/      # CI 配置
│   ├── build.yml           # Windows + Android 构建
│   └── deploy-web.yml      # Web 部署到 GitHub Pages
├── src/                    # 前端 (vanilla TS)
├── src-tauri/              # Rust 后端
│   ├── src/lib.rs          # Tauri 入口
│   └── tauri.conf.json     # Tauri 配置
├── index.html
├── vite.config.ts          # base path 通过 VITE_BASE 环境变量控制
└── package.json
```
