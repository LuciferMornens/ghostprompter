use crate::commands::script::Script;
use parking_lot::Mutex;

#[derive(Default)]
pub struct AppState {
    pub registered_hotkey_shortcuts: Mutex<Vec<String>>,
    pub live_script: Mutex<Option<Script>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_state_has_empty_registered_hotkey_shortcuts() {
        let state = AppState::default();
        let guard = state.registered_hotkey_shortcuts.lock();
        assert!(guard.is_empty());
        assert!(state.live_script.lock().is_none());
    }

    #[test]
    fn mutex_can_be_locked_and_modified() {
        let state = AppState::default();
        {
            let mut guard = state.registered_hotkey_shortcuts.lock();
            guard.push("F7".to_string());
            guard.push("F8".to_string());
        }
        let guard = state.registered_hotkey_shortcuts.lock();
        assert_eq!(guard.len(), 2);
        assert_eq!(guard[0], "F7");
        assert_eq!(guard[1], "F8");
    }

    #[test]
    fn live_script_can_be_stored_and_read_back() {
        let state = AppState::default();
        {
            let mut guard = state.live_script.lock();
            *guard = Some(Script {
                path: None,
                name: "Live.md".into(),
                content: "# Live".into(),
                dirty: true,
            });
        }

        let guard = state.live_script.lock();
        let script = guard.as_ref().expect("live script should be set");
        assert_eq!(script.name, "Live.md");
        assert_eq!(script.content, "# Live");
        assert!(script.dirty);
    }
}
