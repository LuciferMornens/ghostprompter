use crate::error::{Error, Result};
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2_app_kit::{NSWindow, NSWindowSharingType};
use tauri::WebviewWindow;

pub fn is_capture_hiding_supported() -> bool {
    true
}

pub fn set_capture_hidden(window: &WebviewWindow, hidden: bool) -> Result<()> {
    let ns_window_ptr = window
        .ns_window()
        .map_err(|e| Error::Other(format!("could not get NSWindow: {e}")))?
        as *mut AnyObject;

    if ns_window_ptr.is_null() {
        return Err(Error::Other("NSWindow pointer is null".into()));
    }

    let sharing = if hidden {
        NSWindowSharingType::None
    } else {
        NSWindowSharingType::ReadOnly
    };

    unsafe {
        let retained: Retained<NSWindow> =
            Retained::retain(ns_window_ptr.cast::<NSWindow>()).ok_or_else(|| {
                Error::Other("failed to retain NSWindow".into())
            })?;
        retained.setSharingType(sharing);
    }

    Ok(())
}
