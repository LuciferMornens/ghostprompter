use crate::error::{Error, Result};
use tauri::WebviewWindow;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
};

pub fn is_capture_hiding_supported() -> bool {
    // WDA_EXCLUDEFROMCAPTURE requires Windows 10 v2004+ (build 19041).
    // We don't block on version; if the call fails we'll surface the error to the caller.
    true
}

pub fn set_capture_hidden(window: &WebviewWindow, hidden: bool) -> Result<()> {
    let hwnd_raw = window
        .hwnd()
        .map_err(|e| Error::Other(format!("could not get HWND: {e}")))?;
    let hwnd = HWND(hwnd_raw.0);

    let affinity = if hidden {
        WDA_EXCLUDEFROMCAPTURE
    } else {
        WDA_NONE
    };

    unsafe {
        SetWindowDisplayAffinity(hwnd, affinity)
            .map_err(|e| Error::Other(format!("SetWindowDisplayAffinity failed: {e}")))?;
    }

    Ok(())
}
