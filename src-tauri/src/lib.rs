//! Núcleo de TicTac: ventana del reloj, bandeja del sistema y ajustes.
//!
//! El dibujo del reloj vive entero en `src/` (HTML/CSS/JS). Este lado solo se
//! ocupa de lo que una página web no puede hacer: la ventana, el menú, el
//! arranque con Windows y guardar los ajustes en disco.

mod settings;

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use settings::{Layer, Settings};
use tauri::menu::{CheckMenuItem, Menu, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, State, Wry};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

const TRAY_ID: &str = "main";
const WINDOW: &str = "main";
const SCALES: [u32; 6] = [50, 75, 100, 125, 150, 200];

/// Tema tal y como lo anuncia el frontend tras leer los `manifest.json`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ThemeInfo {
    pub id: String,
    pub name: String,
}

#[derive(Default)]
struct AppState {
    settings: Mutex<Settings>,
    themes: Mutex<Vec<ThemeInfo>>,
}

// ---------------------------------------------------------------------------
// Comandos invocables desde JavaScript
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_settings(state: State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

/// El frontend descubre los temas (themes/themes.json + manifests) y se los
/// pasa aquí para poder pintarlos en el menú.
#[tauri::command]
fn register_themes(app: AppHandle, state: State<AppState>, themes: Vec<ThemeInfo>) {
    {
        let mut s = state.settings.lock().unwrap();
        if !themes.iter().any(|t| t.id == s.theme) {
            if let Some(first) = themes.first() {
                s.theme = first.id.clone();
            }
        }
    }
    *state.themes.lock().unwrap() = themes;
    refresh_menu(&app);
}

/// Ajusta la ventana al tamaño que pide el tema (ya multiplicado por la escala).
#[tauri::command]
fn resize_window(app: AppHandle, width: f64, height: f64) {
    if let Some(w) = app.get_webview_window(WINDOW) {
        let _ = w.set_size(LogicalSize::new(width.max(40.0), height.max(40.0)));
    }
}

/// Muestra la ventana cuando el primer tema ya está pintado (evita parpadeos).
#[tauri::command]
fn clock_ready(app: AppHandle) {
    if let Some(w) = app.get_webview_window(WINDOW) {
        let _ = w.show();
    }
}

/// Clic derecho sobre el reloj: el mismo menú que la bandeja.
#[tauri::command]
fn show_context_menu(app: AppHandle) {
    if let (Some(w), Ok(menu)) = (app.get_webview_window(WINDOW), build_menu(&app)) {
        let _ = w.popup_menu(&menu);
    }
}

// ---------------------------------------------------------------------------
// Menú (bandeja + clic derecho)
// ---------------------------------------------------------------------------

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let state = app.state::<AppState>();
    let s = state.settings.lock().unwrap().clone();
    let themes = state.themes.lock().unwrap().clone();
    let autostart = app.autolaunch().is_enabled().unwrap_or(false);

    let check = |id: &str, text: &str, on: bool| {
        CheckMenuItem::with_id(app, id, text, true, on, None::<&str>)
    };

    let mut theme_menu = SubmenuBuilder::new(app, "Tema");
    if themes.is_empty() {
        theme_menu = theme_menu.item(&MenuItem::with_id(
            app,
            "none",
            "Cargando…",
            false,
            None::<&str>,
        )?);
    }
    for t in &themes {
        theme_menu = theme_menu.item(&check(
            &format!("theme:{}", t.id),
            &t.name,
            t.id == s.theme,
        )?);
    }

    let mut size_menu = SubmenuBuilder::new(app, "Tamaño");
    for pct in SCALES {
        let on = ((s.scale * 100.0).round() as u32) == pct;
        size_menu = size_menu.item(&check(&format!("scale:{pct}"), &format!("{pct} %"), on)?);
    }

    let layer_menu = SubmenuBuilder::new(app, "Posición")
        .item(&check("layer:normal", "Normal", s.layer == Layer::Normal)?)
        .item(&check(
            "layer:top",
            "Siempre encima",
            s.layer == Layer::Top,
        )?)
        .item(&check(
            "layer:bottom",
            "Pegado al escritorio",
            s.layer == Layer::Bottom,
        )?)
        .separator()
        .item(&check(
            "locked",
            "Bloquear (los clics lo atraviesan)",
            s.locked,
        )?)
        .item(&MenuItem::with_id(
            app,
            "center",
            "Centrar en pantalla",
            true,
            None::<&str>,
        )?)
        .build()?;

    MenuBuilder::new(app)
        .item(&theme_menu.build()?)
        .item(&size_menu.build()?)
        .item(&layer_menu)
        .separator()
        .item(&check("hour24", "Formato 24 h", s.hour24)?)
        .item(&check("seconds", "Mostrar segundos", s.show_seconds)?)
        .separator()
        .item(&check("autostart", "Iniciar con Windows", autostart)?)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&MenuItem::with_id(
            app,
            "quit",
            "Salir",
            true,
            None::<&str>,
        )?)
        .build()
}

fn refresh_menu(app: &AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id(TRAY_ID), build_menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}

fn on_menu(app: &AppHandle, id: &str) {
    match id {
        "quit" => {
            let _ = app.save_window_state(StateFlags::POSITION);
            app.exit(0);
            return;
        }
        "center" => {
            if let Some(w) = app.get_webview_window(WINDOW) {
                let _ = w.center();
            }
            return;
        }
        "autostart" => {
            let al = app.autolaunch();
            let _ = if al.is_enabled().unwrap_or(false) {
                al.disable()
            } else {
                al.enable()
            };
            refresh_menu(app);
            return;
        }
        _ => {}
    }

    let state = app.state::<AppState>();
    let updated = {
        let mut s = state.settings.lock().unwrap();
        if let Some(theme) = id.strip_prefix("theme:") {
            s.theme = theme.to_string();
        } else if let Some(pct) = id
            .strip_prefix("scale:")
            .and_then(|p| p.parse::<f64>().ok())
        {
            s.scale = pct / 100.0;
        } else if let Some(layer) = id.strip_prefix("layer:") {
            s.layer = match layer {
                "top" => Layer::Top,
                "bottom" => Layer::Bottom,
                _ => Layer::Normal,
            };
        } else {
            match id {
                "locked" => s.locked = !s.locked,
                "hour24" => s.hour24 = !s.hour24,
                "seconds" => s.show_seconds = !s.show_seconds,
                _ => return,
            }
        }
        s.clone()
    };

    settings::save(app, &updated);
    apply_window(app, &updated);
    let _ = app.emit("settings-changed", &updated);
    refresh_menu(app);
}

/// Aplica a la ventana lo que no depende del tema: capa y bloqueo.
fn apply_window(app: &AppHandle, s: &Settings) {
    if let Some(w) = app.get_webview_window(WINDOW) {
        let _ = w.set_always_on_top(s.layer == Layer::Top);
        let _ = w.set_always_on_bottom(s.layer == Layer::Bottom);
        let _ = w.set_ignore_cursor_events(s.locked);
    }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

pub fn run() {
    tauri::Builder::default()
        // Debe ir el primero: si ya hay un reloj abierto, no abrimos otro.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window(WINDOW) {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            register_themes,
            resize_window,
            clock_ready,
            show_context_menu
        ])
        .on_menu_event(|app, event| on_menu(app, event.id().as_ref()))
        .setup(|app| {
            let handle = app.handle().clone();
            let loaded = settings::load(&handle);
            *app.state::<AppState>().settings.lock().unwrap() = loaded.clone();

            let menu = build_menu(&handle)?;
            TrayIconBuilder::with_id(TRAY_ID)
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("falta el icono de la app"),
                )
                .tooltip("TicTac")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .build(app)?;

            apply_window(&handle, &loaded);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al arrancar TicTac");
}
