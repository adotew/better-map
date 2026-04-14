mod commands;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(commands::watch::WatcherState::new()))
        .invoke_handler(tauri::generate_handler![
            commands::fs::open_file,
            commands::fs::save_file,
            commands::watch::watch_file,
            commands::watch::unwatch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
