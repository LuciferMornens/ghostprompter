mod commands;
mod error;
mod platform;
mod settings;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::script::read_script,
            commands::script::save_script,
            commands::window_mode::enter_teleprompter_mode,
            commands::window_mode::exit_teleprompter_mode,
            commands::window_mode::set_edit_mode,
            commands::window_mode::set_capture_invisible,
            commands::window_mode::set_click_through,
            commands::window_mode::is_capture_invisible_supported,
            commands::window_mode::set_overlay_rect,
            commands::hotkeys::register_hotkeys,
            commands::hotkeys::unregister_hotkeys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
