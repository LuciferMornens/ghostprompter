use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Script {
    pub path: Option<String>,
    pub name: String,
    pub content: String,
    pub dirty: bool,
}

pub(crate) fn display_name(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

#[tauri::command]
pub async fn read_script(path: String) -> Result<Script> {
    let p = PathBuf::from(&path);
    let content = std::fs::read_to_string(&p)?;
    Ok(Script {
        path: Some(path),
        name: display_name(&p),
        content,
        dirty: false,
    })
}

#[tauri::command]
pub async fn save_script(path: String, content: String) -> Result<String> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    std::fs::write(&p, content)?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn display_name_returns_file_name() {
        let p = PathBuf::from("some/dir/script.txt");
        assert_eq!(display_name(&p), "script.txt");
    }

    #[test]
    fn display_name_handles_no_extension() {
        let p = PathBuf::from("script");
        assert_eq!(display_name(&p), "script");
    }

    #[test]
    fn display_name_falls_back_to_untitled_when_empty() {
        let p = PathBuf::from("");
        assert_eq!(display_name(&p), "Untitled");
    }

    #[test]
    fn display_name_handles_unicode_filename() {
        let p = PathBuf::from("dir/脚本.txt");
        assert_eq!(display_name(&p), "脚本.txt");
    }

    #[tokio::test]
    async fn save_script_writes_file_and_returns_path() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("hello.txt");
        let path_str = file_path.to_string_lossy().to_string();

        let returned = save_script(path_str.clone(), "hello world".to_string())
            .await
            .unwrap();

        assert_eq!(returned, path_str);
        let on_disk = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(on_disk, "hello world");
    }

    #[tokio::test]
    async fn save_script_creates_parent_directories() {
        let dir = TempDir::new().unwrap();
        let nested = dir.path().join("a").join("b").join("c").join("nested.txt");
        let path_str = nested.to_string_lossy().to_string();

        save_script(path_str.clone(), "nested content".to_string())
            .await
            .unwrap();

        assert!(nested.exists(), "nested file should have been created");
        let on_disk = std::fs::read_to_string(&nested).unwrap();
        assert_eq!(on_disk, "nested content");
    }

    #[tokio::test]
    async fn read_script_round_trips_content_and_metadata() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("doc.md");
        std::fs::write(&file_path, "the body").unwrap();
        let path_str = file_path.to_string_lossy().to_string();

        let script = read_script(path_str.clone()).await.unwrap();

        assert_eq!(script.path, Some(path_str));
        assert_eq!(script.name, "doc.md");
        assert_eq!(script.content, "the body");
        assert!(!script.dirty);
    }

    #[tokio::test]
    async fn read_script_errors_on_missing_file() {
        let dir = TempDir::new().unwrap();
        let missing = dir.path().join("does-not-exist.txt");
        let path_str = missing.to_string_lossy().to_string();

        let result = read_script(path_str).await;
        let err = result.expect_err("expected an error for a missing file");
        // Must be the Io variant with NotFound, not some other kind of error.
        match err {
            crate::error::Error::Io(io) => {
                assert_eq!(io.kind(), std::io::ErrorKind::NotFound);
            }
            other => panic!("expected Io(NotFound), got: {other:?}"),
        }
    }

    #[tokio::test]
    async fn save_script_overwrites_existing_file() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("overwrite.txt");
        let path_str = file_path.to_string_lossy().to_string();

        save_script(path_str.clone(), "first".to_string())
            .await
            .unwrap();
        save_script(path_str.clone(), "second".to_string())
            .await
            .unwrap();

        let on_disk = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(on_disk, "second");
    }

    #[tokio::test]
    async fn save_script_accepts_empty_content() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("empty.txt");
        let path_str = file_path.to_string_lossy().to_string();

        save_script(path_str.clone(), String::new()).await.unwrap();
        let on_disk = std::fs::read_to_string(&file_path).unwrap();
        assert_eq!(on_disk, "");
    }

    #[tokio::test]
    async fn save_script_preserves_exact_bytes_including_newlines() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("newlines.txt");
        let path_str = file_path.to_string_lossy().to_string();
        let content = "line1\nline2\r\nline3\n";

        save_script(path_str.clone(), content.to_string())
            .await
            .unwrap();
        let bytes = std::fs::read(&file_path).unwrap();
        assert_eq!(bytes, content.as_bytes());
    }

    #[test]
    fn script_serializes_with_camel_case_keys() {
        let s = Script {
            path: Some("/tmp/x".into()),
            name: "x".into(),
            content: "body".into(),
            dirty: true,
        };
        let value = serde_json::to_value(&s).unwrap();
        let obj = value.as_object().unwrap();
        assert!(obj.contains_key("path"));
        assert!(obj.contains_key("name"));
        assert!(obj.contains_key("content"));
        assert!(obj.contains_key("dirty"));
        // Sanity: all four + no extras.
        assert_eq!(obj.len(), 4);
    }

    #[test]
    fn script_roundtrips_through_json() {
        let original = Script {
            path: Some("/some/path.md".into()),
            name: "path.md".into(),
            content: "# Title\n\nbody".into(),
            dirty: false,
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: Script = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.path, original.path);
        assert_eq!(parsed.name, original.name);
        assert_eq!(parsed.content, original.content);
        assert_eq!(parsed.dirty, original.dirty);
    }

    #[test]
    fn script_null_path_serializes_and_parses() {
        let s = Script {
            path: None,
            name: "Untitled".into(),
            content: String::new(),
            dirty: false,
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"path\":null"));
        let parsed: Script = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.path, None);
    }

    #[tokio::test]
    async fn unicode_content_round_trips() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("unicode.txt");
        let path_str = file_path.to_string_lossy().to_string();
        let content = "Hello 🌍\n你好,世界\nこんにちは\n";

        save_script(path_str.clone(), content.to_string())
            .await
            .unwrap();
        let script = read_script(path_str.clone()).await.unwrap();

        assert_eq!(script.content, content);
        assert_eq!(script.name, "unicode.txt");
        assert_eq!(script.path.as_deref(), Some(path_str.as_str()));
        assert!(!script.dirty);
    }
}
