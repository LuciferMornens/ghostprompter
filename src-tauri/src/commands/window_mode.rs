use crate::error::Result;
use crate::platform;
use tauri::{Emitter, LogicalPosition, LogicalSize, Manager, WebviewWindow};

pub(crate) fn mode_changed_payload(mode: &str, edit: bool) -> serde_json::Value {
    serde_json::json!({ "mode": mode, "edit": edit })
}

fn emit_mode(window: &WebviewWindow, mode: &str, edit: bool) {
    let _ = window.emit("mode-changed", mode_changed_payload(mode, edit));
}

// Editor window defaults, used when exiting teleprompter mode back to the
// full-sized editor. Keep in sync with tauri.conf.json initial window size.
const EDITOR_DEFAULT_W: f64 = 1100.0;
const EDITOR_DEFAULT_H: f64 = 720.0;

#[tauri::command]
pub async fn enter_teleprompter_mode(app: tauri::AppHandle) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    window.set_decorations(false)?;
    // Kill the OS drop-shadow that otherwise renders a ghostly border
    // around the transparent window in teleprompter mode.
    let _ = window.set_shadow(false);
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    window.set_resizable(false)?;
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
    window.set_resizable(true)?;
    window.set_decorations(true)?;
    let _ = window.set_shadow(true);
    // Restore to a sensible editor size and re-center on the active monitor
    // so we don't leave the user with a tiny corner-glued editor.
    window.set_size(LogicalSize::new(EDITOR_DEFAULT_W, EDITOR_DEFAULT_H))?;
    let _ = window.center();

    emit_mode(&window, "editor", false);
    Ok(())
}

/// Resize and move the main window to exactly match the teleprompter overlay
/// rectangle in logical (CSS) pixels. This is the only honest way to kill
/// the "shadow border" around a large transparent window — the OS draws the
/// drop-shadow around whatever size the window actually is, so we make the
/// window match the visible panel.
#[tauri::command]
pub async fn set_overlay_rect(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<()> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    // Clamp width/height to something the OS will actually respect.
    let w = w.max(120.0);
    let h = h.max(80.0);

    window.set_size(LogicalSize::new(w, h))?;
    window.set_position(LogicalPosition::new(x, y))?;
    let _ = window.set_shadow(false);
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
