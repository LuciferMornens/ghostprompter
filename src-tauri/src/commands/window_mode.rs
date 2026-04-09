use crate::commands::script::Script;
use crate::error::Result;
use crate::platform;
use crate::state::AppState;
use tauri::{Emitter, LogicalPosition, LogicalSize, Manager, WebviewWindow};

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const OVERLAY_WINDOW_LABEL: &str = "overlay";

#[derive(Debug, Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

pub(crate) fn mode_changed_payload(mode: &str, edit: bool) -> serde_json::Value {
    serde_json::json!({ "mode": mode, "edit": edit })
}

fn emit_mode(window: &WebviewWindow, mode: &str, edit: bool) {
    let _ = window.emit("mode-changed", mode_changed_payload(mode, edit));
}

fn overlay_window_config(app: &tauri::AppHandle) -> Result<tauri::utils::config::WindowConfig> {
    app.config()
        .app
        .windows
        .iter()
        .find(|config| config.label == OVERLAY_WINDOW_LABEL)
        .cloned()
        .ok_or_else(|| "overlay window config not found".into())
}

fn ensure_overlay_window(app: &tauri::AppHandle) -> Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(OVERLAY_WINDOW_LABEL) {
        return Ok(window);
    }

    let config = overlay_window_config(app)?;
    tauri::WebviewWindowBuilder::from_config(app, &config)?
        .build()
        .map_err(Into::into)
}

fn main_window(app: &tauri::AppHandle) -> Result<WebviewWindow> {
    app.get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "main window not found".into())
}

fn normalize_overlay_rect(rect: OverlayRect) -> OverlayRect {
    OverlayRect {
        x: rect.x,
        y: rect.y,
        w: rect.w.max(120.0),
        h: rect.h.max(80.0),
    }
}

fn apply_overlay_rect(window: &WebviewWindow, rect: OverlayRect) -> Result<()> {
    let rect = normalize_overlay_rect(rect);
    window.set_size(LogicalSize::new(rect.w, rect.h))?;
    window.set_position(LogicalPosition::new(rect.x, rect.y))?;
    let _ = window.set_shadow(false);
    Ok(())
}

pub(crate) fn restore_main_window(app: &tauri::AppHandle) -> Result<()> {
    let window = main_window(app)?;
    window.show()?;
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
pub async fn enter_teleprompter_mode(
    app: tauri::AppHandle,
    script: Script,
    rect: OverlayRect,
) -> Result<()> {
    {
        let state = app.state::<AppState>();
        *state.live_script.lock() = Some(script);
    }

    let main = main_window(&app)?;
    let window = ensure_overlay_window(&app)?;

    window.set_min_size(None::<LogicalSize<f64>>)?;
    window.set_decorations(false)?;
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    window.set_resizable(true)?;
    window.set_ignore_cursor_events(false)?;
    platform::set_capture_hidden(&window, true)?;
    apply_overlay_rect(&window, rect)?;
    window.show()?;
    let _ = window.set_focus();
    main.hide()?;

    emit_mode(&window, "teleprompter", true);
    Ok(())
}

#[tauri::command]
pub async fn exit_teleprompter_mode(app: tauri::AppHandle) -> Result<()> {
    if let Some(window) = app.get_webview_window(OVERLAY_WINDOW_LABEL) {
        let _ = platform::set_capture_hidden(&window, false);
        let _ = window.set_ignore_cursor_events(false);
        let _ = window.close();
    }
    restore_main_window(&app)?;
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
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("overlay window not found")?;
    apply_overlay_rect(&window, OverlayRect { x, y, w, h })
}

#[tauri::command]
pub async fn set_edit_mode(app: tauri::AppHandle, edit: bool) -> Result<()> {
    let window = app
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("overlay window not found")?;

    window.set_ignore_cursor_events(!edit)?;
    emit_mode(&window, "teleprompter", edit);
    Ok(())
}

#[tauri::command]
pub async fn set_capture_invisible(app: tauri::AppHandle, invisible: bool) -> Result<()> {
    let window = app
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("overlay window not found")?;
    platform::set_capture_hidden(&window, invisible)?;
    Ok(())
}

#[tauri::command]
pub async fn set_click_through(app: tauri::AppHandle, enabled: bool) -> Result<()> {
    let window = app
        .get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or("overlay window not found")?;
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

    #[test]
    fn normalize_overlay_rect_clamps_minimum_size() {
        let rect = normalize_overlay_rect(OverlayRect {
            x: 10.0,
            y: 20.0,
            w: 40.0,
            h: 50.0,
        });

        assert_eq!(rect.x, 10.0);
        assert_eq!(rect.y, 20.0);
        assert_eq!(rect.w, 120.0);
        assert_eq!(rect.h, 80.0);
    }

    #[test]
    fn normalize_overlay_rect_preserves_valid_size() {
        let rect = normalize_overlay_rect(OverlayRect {
            x: 10.0,
            y: 20.0,
            w: 480.0,
            h: 320.0,
        });

        assert_eq!(rect.w, 480.0);
        assert_eq!(rect.h, 320.0);
    }
}
