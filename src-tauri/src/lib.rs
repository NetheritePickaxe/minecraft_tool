// MC 工具箱 - Tauri 后端入口
// 各功能模块在此注册 #[tauri::command]

mod motd;

use motd::{run as run_motd, MotdError, MotdQuery, MotdResult};

/// 查询 Minecraft 服务器 MOTD（Java 版 / 基岩版）
#[tauri::command]
async fn query_motd(query: MotdQuery) -> Result<MotdResult, MotdError> {
    // 网络查询为阻塞 IO，放入 Tauri 的异步线程池执行，避免阻塞主线程
    tauri::async_runtime::spawn_blocking(move || run_motd(query))
        .await
        .map_err(|e| MotdError {
            kind: "unknown".into(),
            message: e.to_string(),
        })?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // updater 插件仅桌面端可用（Android/iOS 不支持，需走自建检查流程）
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![query_motd])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
