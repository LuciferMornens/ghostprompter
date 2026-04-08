use crate::error::Result;
use crate::platform;
use tauri::{Emitter, Manager, WebviewWindow};

pub(crate) fn mode_changed_payload(mode: &str, edit: bool) -> serde_json::Value {
    serde_json::json!({ "mode": mode, "edit": edit })
}

fn emit_mode(window: &WebviewWindow, mode: &str, edit: bool) {
    let _ = window.emit("mode-changed", mode_changed_payload(mode, edit));
}

#[tauri::command]
pub async fn enter_teleprompter_mode(app: tauri::AppHandle) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    window.set_decorations(false)?;
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    window.set_ignore_cursor_events(true)?;
    platform::set_capture_hidden(&window, true)?;

    emit_mode(&window, "teleprompter", false);
    Ok(())
}

#[tauri::command]
pub async fn exit_teleprompter_mode(app: tauri::AppHandle) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    platform::set_capture_hidden(&window, false)?;
    window.set_ignore_cursor_events(false)?;
    window.set_skip_taskbar(false)?;
    window.set_always_on_top(false)?;
    window.set_decorations(true)?;

    emit_mode(&window, "editor", false);
    Ok(())
}

#[tauri::command]
pub async fn set_edit_mode(app: tauri::AppHandle, edit: bool) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    window.set_ignore_cursor_events(!edit)?;
    emit_mode(&window, "teleprompter", edit);
    Ok(())
}

#[tauri::command]
pub async fn set_capture_invisible(app: tauri::AppHandle, invisible: bool) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    platform::set_capture_hidden(&window, invisible)?;
    Ok(())
}

#[tauri::command]
pub async fn set_click_through(app: tauri::AppHandle, enabled: bool) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window.set_ignore_cursor_events(enabled)?;
    Ok(())
}

#[tauri::command]
pub async fn is_capture_invisible_supported() -> Result<bool> {
    Ok(platform::is_capture_hiding_supported())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mode_changed_payload_editor_false() {
        let v = mode_changed_payload("editor", false);
        assert_eq!(v["mode"], "editor");
        assert_eq!(v["edit"], false);
        // Exactly two keys, no surprises.
        assert_eq!(v.as_object().unwrap().len(), 2);
    }

    #[test]
    fn mode_changed_payload_teleprompter_true() {
        let v = mode_changed_payload("teleprompter", true);
        assert_eq!(v["mode"], "teleprompter");
        assert_eq!(v["edit"], true);
    }

    #[test]
    fn mode_changed_payload_serializes_to_expected_json() {
        let v = mode_changed_payload("teleprompter", false);
        let s = serde_json::to_string(&v).unwrap();
        // Object key order in serde_json is insertion order for preserve_order-less
        // builds; we assert structural equality rather than string identity.
        let parsed: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(parsed["mode"], "teleprompter");
        assert_eq!(parsed["edit"], false);
    }

    #[tokio::test]
    async fn is_capture_invisible_supported_matches_platform_value() {
        let supported = is_capture_invisible_supported().await.unwrap();
        assert_eq!(supported, platform::is_capture_hiding_supported());
    }
}
