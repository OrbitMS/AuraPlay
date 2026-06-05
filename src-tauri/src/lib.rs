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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            download_track,
            list_downloaded,
            delete_download,
            get_offline_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
