#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod llm_backend;

fn main() {
  tauri::Builder::default()
    // плагіни (за потреби можна й інші)
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    // РЕЄСТРАЦІЯ ВСІХ КОМАНД (важливо: тут є llm_chat)
    .invoke_handler(tauri::generate_handler![
      // settings/cache
      commands::get_settings,
      commands::save_settings,
      commands::load_library_cache,
      commands::save_library_cache,
      commands::load_cached_inputs,

      // links/helpers
      commands::open_apikey_page,
      commands::open_family_page,
      commands::open_url_external,
      commands::ensure_browser_helper,
      commands::open_extensions_manager,

      // steam / scan
      commands::detect_accounts,
      commands::auto_detect_steam_roots,
      commands::scan_library_unified,
      commands::fetch_full_library,
      commands::resolve_steamids_from_text,

      // === LLM ===
      commands::llm_chat,
    ])
    .run(tauri::generate_context!())
    .expect("error while running SteamGameHelper");
}
