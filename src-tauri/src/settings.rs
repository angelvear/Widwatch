//! Ajustes del usuario, guardados en `%APPDATA%/io.github.angelvear.widwatch/settings.json`.

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Layer {
    /// Una ventana más.
    #[default]
    Normal,
    /// Siempre por encima del resto de ventanas.
    Top,
    /// Siempre por debajo: se comporta como un widget del escritorio.
    Bottom,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub scale: f64,
    pub layer: Layer,
    pub locked: bool,
    pub hour24: bool,
    pub show_seconds: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "digital".into(),
            scale: 1.0,
            layer: Layer::Bottom,
            locked: false,
            hour24: true,
            show_seconds: true,
        }
    }
}

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("settings.json"))
}

pub fn load(app: &AppHandle) -> Settings {
    path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|txt| serde_json::from_str(&txt).ok())
        .unwrap_or_default()
}

pub fn save(app: &AppHandle, s: &Settings) {
    let Some(p) = path(app) else { return };
    if let Some(dir) = p.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(txt) = serde_json::to_string_pretty(s) {
        let _ = fs::write(p, txt);
    }
}
