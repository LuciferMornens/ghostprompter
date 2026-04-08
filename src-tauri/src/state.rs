use parking_lot::Mutex;

#[derive(Default)]
pub struct AppState {
    pub registered_hotkey_shortcuts: Mutex<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_state_has_empty_registered_hotkey_shortcuts() {
        let state = AppState::default();
        let guard = state.registered_hotkey_shortcuts.lock();
        assert!(guard.is_empty());
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
}
