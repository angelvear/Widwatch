// Evita que se abra una consola junto al reloj en las builds de release de Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    widwatch_lib::run()
}
