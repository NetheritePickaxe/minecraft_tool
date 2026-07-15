// MC 工具箱 - Tauri 后端入口
// 在这里通过 #[tauri::command] 添加工具箱功能

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
