use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("{0}")]
    Other(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<anyhow::Error> for Error {
    fn from(err: anyhow::Error) -> Self {
        Error::Other(err.to_string())
    }
}

impl From<String> for Error {
    fn from(s: String) -> Self {
        Error::Other(s)
    }
}

impl From<&str> for Error {
    fn from(s: &str) -> Self {
        Error::Other(s.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_string_produces_other() {
        let err: Error = String::from("boom").into();
        match err {
            Error::Other(msg) => assert_eq!(msg, "boom"),
            _ => panic!("expected Error::Other"),
        }
    }

    #[test]
    fn from_str_produces_other() {
        let err: Error = "kaboom".into();
        match err {
            Error::Other(msg) => assert_eq!(msg, "kaboom"),
            _ => panic!("expected Error::Other"),
        }
    }

    #[test]
    fn from_anyhow_converts_to_other() {
        let any = anyhow::anyhow!("anyhow message");
        let err: Error = any.into();
        match err {
            Error::Other(msg) => assert_eq!(msg, "anyhow message"),
            _ => panic!("expected Error::Other"),
        }
    }

    #[test]
    fn from_io_error_produces_io_variant_and_display_matches() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "missing file");
        let display_inner = io_err.to_string();
        let err: Error = io_err.into();
        match &err {
            Error::Io(inner) => {
                assert_eq!(inner.kind(), std::io::ErrorKind::NotFound);
            }
            _ => panic!("expected Error::Io"),
        }
        assert_eq!(err.to_string(), format!("io error: {display_inner}"));
    }

    #[test]
    fn other_serializes_to_json_string_literal() {
        let err = Error::Other("boom".into());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(json, "\"boom\"");
    }

    #[test]
    fn io_serializes_to_json_string_with_display() {
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        let err: Error = io_err.into();
        let json = serde_json::to_string(&err).unwrap();
        // Serialization uses Display, which prefixes "io error: ".
        assert!(json.starts_with("\"io error: "));
        assert!(json.ends_with("\""));
    }

    #[test]
    fn result_alias_works() {
        fn ok_value() -> Result<i32> {
            Ok(42)
        }
        fn err_value() -> Result<i32> {
            Err("nope".into())
        }
        assert_eq!(ok_value().unwrap(), 42);
        let e = err_value().unwrap_err();
        assert_eq!(e.to_string(), "nope");
    }
}
