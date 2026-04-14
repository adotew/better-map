use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

pub struct WatcherState {
    watcher: Option<RecommendedWatcher>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self { watcher: None }
    }
}

#[tauri::command]
pub fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    // Drop the old watcher (stops watching the previous file)
    state.watcher = None;

    // Watch the parent directory — some editors do atomic saves (write tmp + rename)
    // which means watching the file directly would miss the event.
    let parent = PathBuf::from(&path)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from(&path));

    let target_filename = PathBuf::from(&path)
        .file_name()
        .map(|f| f.to_os_string())
        .ok_or("Invalid file path")?;

    let watch_path = PathBuf::from(&path);
    let app_handle = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {
                    let matches = event.paths.iter().any(|p| {
                        p.file_name()
                            .map(|f| f == target_filename)
                            .unwrap_or(false)
                    });
                    if matches {
                        if let Ok(content) = std::fs::read_to_string(&watch_path) {
                            let _ = app_handle.emit("file-changed", content);
                        }
                    }
                }
                _ => {}
            }
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&parent, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    state.watcher = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn unwatch_file(app: AppHandle) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.watcher = None;
    Ok(())
}
