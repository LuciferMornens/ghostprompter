use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Hotkeys {
    pub play_pause: String,
    pub slower: String,
    pub faster: String,
    pub hide_show: String,
    pub toggle_edit_mode: String,
    pub line_up: String,
    pub line_down: String,
    pub jump_start: String,
    pub jump_end: String,
    pub stop: String,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self {
            play_pause: "F7".into(),
            slower: "F8".into(),
            faster: "F9".into(),
            hide_show: "F10".into(),
            toggle_edit_mode: "F6".into(),
            line_up: "Shift+Up".into(),
            line_down: "Shift+Down".into(),
            jump_start: "Control+Home".into(),
            jump_end: "Control+End".into(),
            stop: "Escape".into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_hotkeys_serialize_camel_case() {
        let hk = Hotkeys::default();
        let json = serde_json::to_string(&hk).unwrap();
        assert!(json.contains("\"playPause\""));
        assert!(json.contains("\"toggleEditMode\""));
    }

    #[test]
    fn default_hotkeys_roundtrip() {
        let hk = Hotkeys::default();
        let json = serde_json::to_string(&hk).unwrap();
        let parsed: Hotkeys = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.play_pause, "F7");
        assert_eq!(parsed.toggle_edit_mode, "F6");
    }

    #[test]
    fn default_hotkeys_field_values() {
        let hk = Hotkeys::default();
        assert_eq!(hk.play_pause, "F7");
        assert_eq!(hk.slower, "F8");
        assert_eq!(hk.faster, "F9");
        assert_eq!(hk.hide_show, "F10");
        assert_eq!(hk.toggle_edit_mode, "F6");
        assert_eq!(hk.line_up, "Shift+Up");
        assert_eq!(hk.line_down, "Shift+Down");
        assert_eq!(hk.jump_start, "Control+Home");
        assert_eq!(hk.jump_end, "Control+End");
        assert_eq!(hk.stop, "Escape");
    }

    #[test]
    fn custom_hotkeys_full_roundtrip() {
        let hk = Hotkeys {
            play_pause: "Control+P".into(),
            slower: "Control+1".into(),
            faster: "Control+2".into(),
            hide_show: "Control+H".into(),
            toggle_edit_mode: "Control+E".into(),
            line_up: "Alt+Up".into(),
            line_down: "Alt+Down".into(),
            jump_start: "Alt+Home".into(),
            jump_end: "Alt+End".into(),
            stop: "Control+Escape".into(),
        };
        let json = serde_json::to_string(&hk).unwrap();
        let parsed: Hotkeys = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.play_pause, "Control+P");
        assert_eq!(parsed.slower, "Control+1");
        assert_eq!(parsed.faster, "Control+2");
        assert_eq!(parsed.hide_show, "Control+H");
        assert_eq!(parsed.toggle_edit_mode, "Control+E");
        assert_eq!(parsed.line_up, "Alt+Up");
        assert_eq!(parsed.line_down, "Alt+Down");
        assert_eq!(parsed.jump_start, "Alt+Home");
        assert_eq!(parsed.jump_end, "Alt+End");
        assert_eq!(parsed.stop, "Control+Escape");
    }

    #[test]
    fn json_uses_strict_camel_case_keys() {
        let hk = Hotkeys::default();
        let value = serde_json::to_value(&hk).unwrap();
        let obj = value.as_object().expect("Hotkeys must serialize as an object");

        let expected: std::collections::BTreeSet<&str> = [
            "playPause",
            "slower",
            "faster",
            "hideShow",
            "toggleEditMode",
            "lineUp",
            "lineDown",
            "jumpStart",
            "jumpEnd",
            "stop",
        ]
        .into_iter()
        .collect();
        let actual: std::collections::BTreeSet<&str> =
            obj.keys().map(|k| k.as_str()).collect();

        assert_eq!(
            actual, expected,
            "Hotkeys JSON key set drifted from the camelCase contract"
        );
        // And no snake_case key should leak through.
        for k in ["play_pause", "hide_show", "toggle_edit_mode", "line_up"] {
            assert!(
                !obj.contains_key(k),
                "unexpected snake_case key '{k}' in serialized Hotkeys"
            );
        }
    }

    #[test]
    fn partial_camel_case_json_fails_to_deserialize() {
        // Missing required field should produce a serde error.
        let json = r#"{"playPause":"F7"}"#;
        let result = serde_json::from_str::<Hotkeys>(json);
        assert!(result.is_err(), "partial JSON must not deserialize");
    }

    #[test]
    fn clone_produces_independent_copy() {
        let a = Hotkeys::default();
        let mut b = a.clone();
        b.play_pause = "Control+P".into();
        assert_eq!(a.play_pause, "F7");
        assert_eq!(b.play_pause, "Control+P");
    }

    #[test]
    fn camel_case_json_parses_successfully() {
        let json = r#"{
            "playPause": "F1",
            "slower": "F2",
            "faster": "F3",
            "hideShow": "F4",
            "toggleEditMode": "F5",
            "lineUp": "Up",
            "lineDown": "Down",
            "jumpStart": "Home",
            "jumpEnd": "End",
            "stop": "Esc"
        }"#;
        let parsed: Hotkeys = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.play_pause, "F1");
        assert_eq!(parsed.toggle_edit_mode, "F5");
        assert_eq!(parsed.jump_start, "Home");
        assert_eq!(parsed.stop, "Esc");
    }

    #[test]
    fn snake_case_json_does_not_parse_to_expected_values() {
        // A JSON document using snake_case keys must NOT successfully populate the
        // camelCase-renamed fields. With #[serde(rename_all = "camelCase")] and no
        // alias, these snake_case keys are unknown, so deserialization fails entirely.
        let json = r#"{
            "play_pause": "F1",
            "slower": "F2",
            "faster": "F3",
            "hide_show": "F4",
            "toggle_edit_mode": "F5",
            "line_up": "Up",
            "line_down": "Down",
            "jump_start": "Home",
            "jump_end": "End",
            "stop": "Esc"
        }"#;
        let parsed = serde_json::from_str::<Hotkeys>(json);
        // Either the parse fails outright (missing camelCase fields) OR, if it
        // somehow succeeded, the camelCase-named fields would not equal the
        // snake_case payload. We assert the strong invariant: it does not parse.
        assert!(
            parsed.is_err(),
            "snake_case JSON should not deserialize into camelCase Hotkeys"
        );
    }
}
