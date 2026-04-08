#[cfg(not(any(target_os = "windows", target_os = "macos")))]
use crate::error::Result;
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
use tauri::WebviewWindow;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use self::windows::{is_capture_hiding_supported, set_capture_hidden};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use self::macos::{is_capture_hiding_supported, set_capture_hidden};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn set_capture_hidden(_window: &WebviewWindow, _hidden: bool) -> Result<()> {
    // No-op on unsupported platforms.
    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn is_capture_hiding_supported() -> bool {
    false
}

#[cfg(test)]
mod tests {
    #[cfg(target_os = "windows")]
    #[test]
    fn windows_reports_supported() {
        assert!(crate::platform::is_capture_hiding_supported());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_reports_supported() {
        assert!(crate::platform::is_capture_hiding_supported());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    #[test]
    fn unsupported_platforms_report_false() {
        assert!(!crate::platform::is_capture_hiding_supported());
    }
}
