mod commands;
mod error;
mod platform;
mod settings;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .on_window_event(|window, event| {
            if window.label() != commands::window_mode::OVERLAY_WINDOW_LABEL {
                return;
            }

            if matches!(event, tauri::WindowEvent::Destroyed) {
                let app = window.app_handle();
                let _ = commands::window_mode::restore_main_window(&app);
                let state = app.state::<AppState>();
                commands::hotkeys::unregister_all_hotkeys(&app, &state);
            }
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::script::read_script,
            commands::script::save_script,
            commands::script::get_live_script,
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
