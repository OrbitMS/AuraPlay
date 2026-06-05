use std::path::PathBuf;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

#[derive(Serialize, Deserialize, Clone)]
pub struct TrackMeta {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub thumbnail: String,
}

fn offline_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("offline"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_track(
    app: AppHandle,
    id: String,
    url: String,
    title: String,
    artist: String,
    thumbnail: String,
) -> Result<(), String> {
    let dir = offline_dir(&app)?;
    tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;

    let audio_path = dir.join(format!("{}.webm", id));
    let meta_path = dir.join(format!("{}.json", id));

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .header("Referer", "https://www.youtube.com/")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Download failed: HTTP {}", response.status()));
    }

    let mut file = tokio::fs::File::create(&audio_path).await.map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        file.write_all(&bytes).await.map_err(|e| e.to_string())?;
    }
    file.flush().await.map_err(|e| e.to_string())?;

    let meta = TrackMeta { id, title, artist, thumbnail };
    let json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
    tokio::fs::write(&meta_path, json).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn list_downloaded(app: AppHandle) -> Result<Vec<TrackMeta>, String> {
    let dir = offline_dir(&app)?;
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut tracks = vec![];
    let mut entries = tokio::fs::read_dir(&dir).await.map_err(|e| e.to_string())?;
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            let content = tokio::fs::read_to_string(&path).await.unwrap_or_default();
            if let Ok(meta) = serde_json::from_str::<TrackMeta>(&content) {
                tracks.push(meta);
            }
        }
    }
    Ok(tracks)
}

#[tauri::command]
async fn delete_download(app: AppHandle, id: String) -> Result<(), String> {
    let dir = offline_dir(&app)?;
    let _ = tokio::fs::remove_file(dir.join(format!("{}.webm", id))).await;
    let _ = tokio::fs::remove_file(dir.join(format!("{}.json", id))).await;
    Ok(())
}

// One-shot loopback server that captures the Spotify OAuth redirect.
// Binds 127.0.0.1:<port>, waits for the /callback request, returns its query
// string (code/state/error) to the frontend, and shows a friendly page.
#[tauri::command]
async fn spotify_oauth_listen(port: u16) -> Result<String, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind(("127.0.0.1", port))
        .await
        .map_err(|e| format!("Could not bind port {port}: {e}"))?;

    loop {
        let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 8192];
        let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
        let req = String::from_utf8_lossy(&buf[..n]);
        let first = req.lines().next().unwrap_or("");
        let path = first.split_whitespace().nth(1).unwrap_or("");

        // Ignore stray requests (e.g. /favicon.ico) — wait for /callback
        if !path.starts_with("/callback") {
            let resp = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes()).await;
            continue;
        }

        let query = path.splitn(2, '?').nth(1).unwrap_or("").to_string();
        let body = "<!doctype html><html><body style='font-family:sans-serif;background:#0e0e12;color:#f0ede8;text-align:center;padding-top:90px'><h2 style='color:#c9a84c;font-weight:600'>AuraPlay</h2><p>Spotify connected — you can close this window and return to the app.</p></body></html>";
        let resp = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        let _ = stream.flush().await;
        return Ok(query);
    }
}

#[tauri::command]
async fn get_offline_path(app: AppHandle, id: String) -> Result<String, String> {
    let path = offline_dir(&app)?.join(format!("{}.webm", id));
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("not cached".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::{Manager, WindowEvent};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            download_track,
            list_downloaded,
            delete_download,
            get_offline_path,
            spotify_oauth_listen,
        ])
        .setup(|app| {
            // ── System tray ────────────────────────────────────────────────
            let show = MenuItem::with_id(app, "show", "Show AuraPlay", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("AuraPlay")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Left-click the tray icon → restore the window
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // Closing the window hides it to the tray instead of quitting, so
        // playback keeps running in the background. Quit from the tray menu.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
