use crate::error::{Error, Result};
use crate::settings::Hotkeys;
use crate::state::AppState;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub(crate) fn parse_shortcut(s: &str) -> std::result::Result<Shortcut, String> {
    s.parse::<Shortcut>()
        .map_err(|e| format!("invalid shortcut '{s}': {e}"))
}

pub(crate) fn action_event(action: &str) -> String {
    format!("hotkey://{action}")
}

fn register_one(app: &AppHandle, shortcut_str: &str, action: &'static str) -> Result<String> {
    let shortcut = parse_shortcut(shortcut_str).map_err(Error::Other)?;
    let app_clone = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _sc, event| {
            if event.state() == ShortcutState::Pressed {
                let _ = app_clone.emit(&action_event(action), ());
            }
        })
        .map_err(|e| Error::Other(format!("failed to register {action}: {e}")))?;
    Ok(shortcut_str.to_string())
}

#[tauri::command]
pub async fn register_hotkeys(app: AppHandle, hotkeys: Hotkeys) -> Result<()> {
    // Clear any previously registered shortcuts first.
    unregister_hotkeys(app.clone()).await?;

    let pairs: [(&str, &str); 10] = [
        (hotkeys.play_pause.as_str(), "play-pause"),
        (hotkeys.slower.as_str(), "slower"),
        (hotkeys.faster.as_str(), "faster"),
        (hotkeys.hide_show.as_str(), "hide"),
        (hotkeys.toggle_edit_mode.as_str(), "edit-mode"),
        (hotkeys.line_up.as_str(), "line-up"),
        (hotkeys.line_down.as_str(), "line-down"),
        (hotkeys.jump_start.as_str(), "jump-start"),
        (hotkeys.jump_end.as_str(), "jump-end"),
        (hotkeys.stop.as_str(), "stop"),
    ];

    let state = app.state::<AppState>();
    let mut registered = state.registered_hotkey_shortcuts.lock();
    registered.clear();

    for (combo, action) in pairs {
        match register_one(&app, combo, action) {
            Ok(s) => registered.push(s),
            Err(e) => log::warn!("hotkey '{combo}' for '{action}' failed: {e}"),
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn unregister_hotkeys(app: AppHandle) -> Result<()> {
    let state = app.state::<AppState>();
    let mut registered = state.registered_hotkey_shortcuts.lock();

    let gs = app.global_shortcut();
    for combo in registered.drain(..) {
        if let Ok(sc) = combo.parse::<Shortcut>() {
            let _ = gs.unregister(sc);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_event_prefixes_with_scheme() {
        assert_eq!(action_event("play-pause"), "hotkey://play-pause");
        assert_eq!(action_event("slower"), "hotkey://slower");
        assert_eq!(action_event(""), "hotkey://");
    }

    #[test]
    fn action_event_matches_all_known_actions() {
        // Sanity: every action name used by `register_hotkeys` should map to a
        // well-formed scheme URL. This guards against accidental drift between
        // the action string table and the frontend `onHotkey(...)` names.
        let actions = [
            "play-pause",
            "slower",
            "faster",
            "hide",
            "edit-mode",
            "line-up",
            "line-down",
            "jump-start",
            "jump-end",
            "stop",
        ];
        for a in actions {
            let ev = action_event(a);
            assert!(ev.starts_with("hotkey://"));
            assert!(ev.ends_with(a));
            assert_eq!(ev.len(), "hotkey://".len() + a.len());
        }
    }

    #[test]
    fn parse_shortcut_accepts_single_function_key() {
        let sc = parse_shortcut("F7").expect("F7 should parse");
        // Round-trip: parsing the display form should yield an equivalent shortcut.
        let round = parse_shortcut(&sc.into_string()).expect("round-trip parse");
        assert_eq!(round, parse_shortcut("F7").unwrap());
    }

    #[test]
    fn parse_shortcut_accepts_modifier_combinations() {
        // Every default hotkey combo from Hotkeys::default must parse successfully.
        for combo in [
            "F7",
            "F8",
            "F9",
            "F10",
            "F6",
            "Shift+Up",
            "Shift+Down",
            "Control+Home",
            "Control+End",
            "Escape",
        ] {
            assert!(
                parse_shortcut(combo).is_ok(),
                "expected default hotkey '{combo}' to parse"
            );
        }
    }

    #[test]
    fn parse_shortcut_rejects_garbage() {
        let err = parse_shortcut("this-is-not-a-shortcut").unwrap_err();
        assert!(
            err.starts_with("invalid shortcut 'this-is-not-a-shortcut':"),
            "error should include the offending input, got: {err}"
        );
    }

    #[test]
    fn parse_shortcut_rejects_empty_string() {
        let err = parse_shortcut("").unwrap_err();
        assert!(err.contains("invalid shortcut ''"));
    }

    #[test]
    fn parse_shortcut_error_format_is_stable() {
        // Pin the error message shape so callers can rely on the prefix.
        let err = parse_shortcut("???").unwrap_err();
        assert!(err.starts_with("invalid shortcut '???':"));
    }
}
