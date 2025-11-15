use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use regex::Regex;
use tauri::{Manager, Runtime}; // Manager для app.path() / opener(), Runtime для generic AppHandle

// ====================== Моделі даних (бібліотека/налаштування) ======================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Game {
  pub appid: i64,
  pub name: String,
  pub installed: bool,
  pub playtime_minutes: Option<u32>,
  pub last_played_unix: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LibraryGame {
  pub appid: i64,
  pub name: String,
  pub installed: bool,
  pub shared_from: Option<String>,
  pub playtime_minutes: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AccountHint {
  pub steamid64: String,
  pub persona: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct UserPrefs {
  pub api_key: String,
  pub main_steam_id64: String,
  pub family_ids: Vec<String>,
  // поля для сумісності (не використовуються для LLM)
  pub ai_api_key: String,
  pub ai_base_url: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct PartialSettings {
  pub api_key: Option<String>,
  pub main_steam_id64: Option<String>,
  pub family_ids: Option<Vec<String>>,
  // для сумісності зі старим UI
  pub ai_api_key: Option<String>,
  pub ai_base_url: Option<String>,
}

// ====================== FS-шляхи/збереження ======================

fn data_dir<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("steamgamehelper");
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}

fn prefs_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
  Ok(data_dir(app)?.join("prefs.json"))
}

fn cache_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
  Ok(data_dir(app)?.join("library_cache.json"))
}

fn meta_cache_path<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
  Ok(data_dir(app)?.join("app_meta.json"))
}

fn save_prefs_internal<R: Runtime>(app: &tauri::AppHandle<R>, prefs: &UserPrefs) -> Result<(), String> {
  let p = prefs_path(app)?;
  let data = serde_json::to_vec_pretty(prefs).map_err(|e| e.to_string())?;
  fs::write(p, data).map_err(|e| e.to_string())
}

fn load_prefs_internal<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<UserPrefs, String> {
  let p = prefs_path(app)?;
  if !p.exists() {
    return Ok(UserPrefs::default());
  }
  let bytes = fs::read(p).map_err(|e| e.to_string())?;
  let prefs: UserPrefs = serde_json::from_slice(&bytes).unwrap_or_default();
  Ok(prefs)
}

// ====================== Налаштування ======================

#[tauri::command]
pub async fn get_settings<R: Runtime>(app: tauri::AppHandle<R>) -> Result<PartialSettings, String> {
  let p = load_prefs_internal(&app)?;
  Ok(PartialSettings {
    api_key: if p.api_key.is_empty() { None } else { Some(p.api_key) },
    main_steam_id64: if p.main_steam_id64.is_empty() { None } else { Some(p.main_steam_id64) },
    family_ids: if p.family_ids.is_empty() { None } else { Some(p.family_ids) },
    ai_api_key: if p.ai_api_key.is_empty() { None } else { Some(p.ai_api_key) },
    ai_base_url: if p.ai_base_url.is_empty() { None } else { Some(p.ai_base_url) },
  })
}

#[tauri::command]
pub async fn save_settings<R: Runtime>(app: tauri::AppHandle<R>, s: PartialSettings) -> Result<(), String> {
  let mut cur = load_prefs_internal(&app)?;
  if let Some(v) = s.api_key { cur.api_key = v; }
  if let Some(v) = s.main_steam_id64 { cur.main_steam_id64 = v; }
  if let Some(v) = s.family_ids { cur.family_ids = dedup_ids(v); }
  if let Some(v) = s.ai_api_key { cur.ai_api_key = v; }
  if let Some(v) = s.ai_base_url { cur.ai_base_url = v; }
  save_prefs_internal(&app, &cur)
}

// ====================== Кеш бібліотеки ======================

#[tauri::command]
pub async fn load_library_cache<R: Runtime>(app: tauri::AppHandle<R>) -> Result<Vec<LibraryGame>, String> {
  let p = cache_path(&app)?;
  if !p.exists() {
    return Ok(vec![]);
  }
  let bytes = fs::read(p).map_err(|e| e.to_string())?;
  let v: Vec<LibraryGame> = serde_json::from_slice(&bytes).unwrap_or_default();
  Ok(v)
}

#[tauri::command]
pub async fn save_library_cache<R: Runtime>(app: tauri::AppHandle<R>, games: Vec<LibraryGame>) -> Result<(), String> {
  let p = cache_path(&app)?;
  let data = serde_json::to_vec_pretty(&games).map_err(|e| e.to_string())?;
  fs::write(p, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_cached_inputs<R: Runtime>(app: tauri::AppHandle<R>) -> Result<UserPrefs, String> {
  load_prefs_internal(&app)
}

// ====================== Відкриття посилань/хелпер ======================

#[tauri::command]
pub async fn open_apikey_page<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
  use tauri_plugin_opener::OpenerExt;
  app.opener()
    .open_url("https://steamcommunity.com/dev/apikey", None::<String>)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_family_page<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
  use tauri_plugin_opener::OpenerExt;
  app.opener()
    .open_url("https://store.steampowered.com/account/familymanagement", None::<String>)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_url_external<R: Runtime>(app: tauri::AppHandle<R>, url: String) -> Result<(), String> {
  use tauri_plugin_opener::OpenerExt;
  app.opener().open_url(&url, None::<String>).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ensure_browser_helper<R: Runtime>(_app: tauri::AppHandle<R>) -> Result<String, String> {
  let base = std::env::current_dir().map_err(|e| e.to_string())?.join("browser_helper");
  fs::create_dir_all(&base).map_err(|e| e.to_string())?;

  let manifest = r#"
{
  "manifest_version": 3,
  "name": "SteamGameHelper Family Copier",
  "version": "1.0.0",
  "description": "Копіює SteamID зі сторінки керування сім'єю.",
  "permissions": ["clipboardWrite", "activeTab", "scripting"],
  "host_permissions": ["https://store.steampowered.com/*"],
  "content_scripts": [{
    "matches": ["https://store.steampowered.com/account/familymanagement*"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]]
}
"#;

  let content_js = r#"(function () {
  const OFFSET = BigInt("76561197960265728");
  function collectOnce() {
    const ids = new Set();
    document.querySelectorAll("[data-miniprofile]").forEach((el) => {
      const acc = el.getAttribute("data-miniprofile");
      const n = Number(acc);
      if (Number.isFinite(n) && n > 0) ids.add((OFFSET + BigInt(n)).toString());
    });
    document.querySelectorAll('a[href*="steamcommunity.com/profiles/"]').forEach((a) => {
      const m = a.href.match(/profiles\/(\d{17})/);
      if (m) ids.add(m[1]);
    });
    return Array.from(ids);
  }
  function ensureButton() {
    let btn = document.getElementById("__sghelper_copy_ids_btn");
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = "__sghelper_copy_ids_btn";
    btn.style.cssText = [
      "position:fixed","right:18px","bottom:18px","z-index:99999",
      "border:none","border-radius:14px","padding:12px 16px","font-size:14px",
      "cursor:pointer","box-shadow:0 6px 18px rgba(0,0,0,.25)",
      "background:#10b981","color:#fff","font-weight:600"
    ].join(";");
    document.body.appendChild(btn);
    return btn;
  }
  function render() {
    const ids = collectOnce();
    const btn = ensureButton();
    if (ids.length === 0) {
      btn.textContent = "No SteamIDs found";
      btn.disabled = true; btn.style.opacity = "0.75";
      return;
    }
    btn.disabled = false; btn.style.opacity = "1";
    btn.textContent = `Copy ${ids.length} SteamIDs`;
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(ids.join(", ")); btn.textContent = "Copied!"; }
      catch { btn.textContent = "Clipboard error"; }
      setTimeout(render, 1200);
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { render(); setTimeout(render, 1200); });
  } else {
    render(); setTimeout(render, 1200);
  }
})();"#;

  fs::write(base.join("manifest.json"), manifest).map_err(|e| e.to_string())?;
  fs::write(base.join("content.js"), content_js).map_err(|e| e.to_string())?;
  Ok(base.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_extensions_manager<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
  use tauri_plugin_opener::OpenerExt;
  app.opener()
    .open_url("https://store.steampowered.com/account/familymanagement", None::<String>)
    .map_err(|e| e.to_string())
}

// ====================== Акаунти/Steam API/Скан ======================

#[tauri::command]
pub async fn detect_accounts() -> Vec<AccountHint> {
  tauri::async_runtime::spawn_blocking(move || detect_accounts_sync())
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn scan_library_unified<R: Runtime>(
  app: tauri::AppHandle<R>,
  api_key: String,
  main_steam_id64: String,
  family_ids: Option<Vec<String>>,
) -> Result<Vec<LibraryGame>, String> {
  let fam = family_ids.unwrap_or_default();

  let mut prefs = load_prefs_internal(&app).unwrap_or_default();
  prefs.api_key = api_key.clone();
  prefs.main_steam_id64 = main_steam_id64.clone();
  prefs.family_ids = dedup_ids(fam.clone());
  let _ = save_prefs_internal(&app, &prefs);

  fetch_full_library(api_key, main_steam_id64, Some(fam)).await
}

#[tauri::command]
pub async fn fetch_full_library(
  api_key: String,
  steam_id64: String,
  family_ids: Option<Vec<String>>,
) -> Result<Vec<LibraryGame>, String> {
  let client = reqwest::Client::new();

  async fn owned(
    client: &reqwest::Client,
    key: &str,
    sid: &str,
  ) -> Result<Vec<LibraryGame>, String> {
    let url = format!(
      "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={key}&steamid={sid}&include_appinfo=1&include_played_free_games=1"
    );
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
      return Err(format!("Steam API HTTP {}", res.status()));
    }

    #[derive(Deserialize)]
    struct ApiGame { appid: i64, name: Option<String>, playtime_forever: Option<u32> }
    #[derive(Deserialize)]
    struct ResponseInner { games: Option<Vec<ApiGame>> }
    #[derive(Deserialize)]
    struct ResponseRoot { response: ResponseInner }

    let root: ResponseRoot = res.json().await.map_err(|e| e.to_string())?;
    let mut out = vec![];
    if let Some(list) = root.response.games {
      for g in list {
        out.push(LibraryGame {
          appid: g.appid,
          name: g.name.unwrap_or_default(),
          installed: false,
          shared_from: None,
          playtime_minutes: g.playtime_forever,
        });
      }
    }
    Ok(out)
  }

  let mut all: HashMap<i64, LibraryGame> = HashMap::new();

  for g in owned(&client, &api_key, &steam_id64).await? {
    all.insert(g.appid, g);
  }

  if let Some(fams) = family_ids {
    for fid in dedup_ids(fams) {
      let list = owned(&client, &api_key, &fid).await?;
      for mut g in list {
        g.shared_from = Some(fid.clone());
        g.playtime_minutes = None;
        all.entry(g.appid).or_insert(g);
      }
    }
  }

  let installed = scan_roots(roots_from_detect_roots()).map_err(|e| e.to_string())?;
  let installed_set: HashSet<i64> = installed.into_iter().map(|g| g.appid).collect();
  for g in all.values_mut() {
    if installed_set.contains(&g.appid) {
      g.installed = true;
    }
  }

  Ok(all.into_values().collect())
}

#[tauri::command]
pub async fn auto_detect_steam_roots() -> Vec<String> {
  tauri::async_runtime::spawn_blocking(move || detect_roots())
    .await
    .unwrap_or_default()
}

// ====================== Утиліти ======================

fn dedup_ids(v: Vec<String>) -> Vec<String> {
  let mut set = HashSet::<String>::new();
  let mut out = Vec::new();
  for s in v {
    let s = s.trim().to_string();
    if s.is_empty() { continue; }
    if set.insert(s.clone()) { out.push(s); }
  }
  out
}

fn scan_roots(roots: Vec<PathBuf>) -> Result<Vec<Game>, String> {
  let mut games: Vec<Game> = vec![];

  for steam_root in roots {
    let steamapps = steam_root.join("steamapps");
    if !steamapps.exists() { continue; }

    let mut to_scan = vec![steamapps.clone()];
    if let Some(extra) = parse_libraryfolders(&steamapps.join("libraryfolders.vdf")) {
      to_scan.extend(extra);
    }

    for dir in to_scan {
      if !dir.exists() { continue; }
      for entry in WalkDir::new(&dir).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        if is_manifest(p) {
          if let Ok(txt) = std::fs::read_to_string(p) {
            if let Some((appid, name)) = parse_manifest(&txt) {
              games.push(Game {
                appid,
                name,
                installed: true,
                playtime_minutes: None,
                last_played_unix: None,
              });
            }
          }
        }
      }
    }
  }

  let stats = collect_user_stats();
  if !stats.is_empty() {
    for g in &mut games {
      if let Some(s) = stats.get(&g.appid) {
        if s.playtime_minutes.is_some() { g.playtime_minutes = s.playtime_minutes; }
        if s.last_played_unix.is_some()  { g.last_played_unix  = s.last_played_unix; }
      }
    }
  }

  Ok(games)
}

fn is_manifest(p: &Path) -> bool {
  p.file_name()
    .and_then(|s| s.to_str())
    .map(|f| f.starts_with("appmanifest_") && f.ends_with(".acf"))
    .unwrap_or(false)
}

fn parse_manifest(s: &str) -> Option<(i64, String)> {
  let re_appid = Regex::new(r#""appid"\s*"(\d+)""#).ok()?;
  let re_name  = Regex::new(r#""name"\s*"([^"]+)""#).ok()?;
  let appid = re_appid.captures(s)
    .and_then(|c| c.get(1))
    .and_then(|m| m.as_str().parse::<i64>().ok())?;
  let name = re_name.captures(s)
    .and_then(|c| c.get(1))
    .map(|m| m.as_str().to_string())?;
  Some((appid, name))
}

fn parse_libraryfolders(path: &Path) -> Option<Vec<PathBuf>> {
  let txt = std::fs::read_to_string(path).ok()?;
  let re_path = Regex::new(r#""path"\s*"([^"]+)""#).ok()?;
  let mut out = vec![];
  for cap in re_path.captures_iter(&txt) {
    let p = PathBuf::from(cap.get(1)?.as_str());
    out.push(p.join("steamapps"));
  }
  if out.is_empty() { None } else { Some(out) }
}

fn detect_roots() -> Vec<String> {
  let mut roots = steam_paths();

  #[cfg(target_os = "windows")]
  {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam") {
      if let Ok(path_str) = hkcu.get_value::<String, _>("SteamPath") {
        let p = PathBuf::from(path_str);
        if !roots.contains(&p) { roots.push(p); }
      }
    }
  }

  let mut extra = vec![];
  for r in &roots {
    let lf = r.join("steamapps").join("libraryfolders.vdf");
    if let Some(more) = parse_libraryfolders(&lf) {
      for e in more {
        if let Some(parent) = e.parent().map(|p| p.to_path_buf()) {
          if !roots.contains(&parent) && !extra.contains(&parent) {
            extra.push(parent);
          }
        }
      }
    }
  }
  roots.extend(extra);

  roots.into_iter()
    .filter(|p| p.exists())
    .map(|p| p.to_string_lossy().to_string())
    .collect()
}

fn steam_paths() -> Vec<PathBuf> {
  let mut out = vec![];

  #[cfg(target_os = "windows")]
  {
    out.push(PathBuf::from("C:/Program Files (x86)/Steam"));
    if let Some(data) = dirs::data_dir() { out.push(data.join("Steam")); }
  }

  #[cfg(target_os = "macos")]
  {
    if let Some(home) = dirs::home_dir() {
      out.push(home.join("Library/Application Support/Steam"));
    }
  }

  #[cfg(target_os = "linux")]
  {
    if let Some(home) = dirs::home_dir() {
      out.push(home.join(".local/share/Steam"));
      out.push(home.join(".steam/steam"));
    }
  }

  out
}

fn roots_from_detect_roots() -> Vec<PathBuf> {
  detect_roots().into_iter().map(PathBuf::from).collect()
}

#[derive(Clone, Debug)]
struct AppStat { playtime_minutes: Option<u32>, last_played_unix: Option<u64> }

fn collect_user_stats() -> HashMap<i64, AppStat> {
  let mut out: HashMap<i64, AppStat> = HashMap::new();

  let mut files: Vec<PathBuf> = vec![];
  for root in roots_from_detect_roots() {
    let userdata = root.join("userdata");
    if !userdata.exists() { continue; }
    if let Ok(entries) = std::fs::read_dir(&userdata) {
      for e in entries.flatten() {
        let p = e.path().join("config").join("localconfig.vdf");
        if p.exists() { files.push(p); }
      }
    }
  }

  let re_apps = Regex::new(r#"(?s)"apps"\s*\{(.*?)\}"#).ok();
  let re_per  = Regex::new(r#"(?s)"(\d+)"\s*\{(.*?)\}"#).ok();
  let re_last = Regex::new(r#""LastPlayed"\s*"(\d+)""#).ok();
  let re_p1   = Regex::new(r#""playtime_forever"\s*"(\d+)""#).ok();
  let re_p2   = Regex::new(r#""Playtime"\s*"(\d+)""#).ok();
  let re_p3   = Regex::new(r#""MinutesPlayed\d*"\s*"(\d+)""#).ok();

  for f in files {
    if let Ok(txt) = std::fs::read_to_string(f) {
      if let Some(cap) = re_apps.as_ref().and_then(|r| r.captures(&txt)) {
        let body = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        if let Some(re) = &re_per {
          for c in re.captures_iter(body) {
            let appid: i64 = c.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
            if appid == 0 { continue; }
            let b = c.get(2).map(|m| m.as_str()).unwrap_or("");

            let last  = re_last.as_ref()
              .and_then(|r| r.captures(b))
              .and_then(|c| c.get(1))
              .and_then(|m| m.as_str().parse::<u64>().ok());

            let playm = re_p1.as_ref()
                .and_then(|r| r.captures(b)).and_then(|c| c.get(1))
                .and_then(|m| m.as_str().parse::<u32>().ok())
              .or_else(|| re_p2.as_ref()
                .and_then(|r| r.captures(b)).and_then(|c| c.get(1))
                .and_then(|m| m.as_str().parse::<u32>().ok()))
              .or_else(|| re_p3.as_ref()
                .and_then(|r| r.captures(b)).and_then(|c| c.get(1))
                .and_then(|m| m.as_str().parse::<u32>().ok()));

            let entry = out.entry(appid).or_insert(AppStat { playtime_minutes: None, last_played_unix: None });
            if playm.is_some() { entry.playtime_minutes = playm; }
            if last.is_some()  { entry.last_played_unix  = last;  }
          }
        }
      }
    }
  }

  out
}

fn detect_accounts_sync() -> Vec<AccountHint> {
  let mut out = vec![];
  let re_user_block = Regex::new(r#"(?s)"(\d{17})"\s*\{(.*?)\}"#).ok();
  let re_persona = Regex::new(r#""PersonaName"\s*"([^"]*)""#).ok();

  for root in roots_from_detect_roots() {
    let file = root.join("config").join("loginusers.vdf");
    if !file.exists() { continue; }
    if let Ok(txt) = std::fs::read_to_string(file) {
      if let Some(re) = &re_user_block {
        for cap in re.captures_iter(&txt) {
          let id = cap.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
          let body = cap.get(2).map(|m| m.as_str()).unwrap_or("");
          let persona = re_persona.as_ref()
            .and_then(|r| r.captures(body))
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
          if !id.is_empty() {
            out.push(AccountHint { steamid64: id, persona });
          }
        }
      }
    }
  }
  out
}


#[tauri::command]
pub async fn resolve_steamids_from_text(text: String) -> Vec<String> {
  let re = Regex::new(r"(76\d{15})").ok();
  let mut out = vec![];
  if let Some(r) = re {
    for c in r.captures_iter(&text) {
      if let Some(m) = c.get(1) {
        out.push(m.as_str().to_string());
      }
    }
  }
  out
}


#[derive(Serialize, Deserialize, Clone, Debug, Default)]
struct AppMeta {
  genres: Vec<String>,
  coop: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct PlayerProfile {
  pub by_genre: HashMap<String, GenreStats>,
  pub rare_genres: Vec<String>,
  pub top_genres: Vec<String>,
  pub total_unplayed: u32,
  pub total_barely_tried: u32,
  pub updated_at: u64,
  pub avg_play_minutes: u32,
  pub max_play_minutes: u32,
  pub short_threshold: u32,
  pub long_threshold: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GenreStats {
  pub minutes: u64,
  pub count: u32,
}

fn load_meta_cache<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<HashMap<i64, AppMeta>, String> {
  let p = meta_cache_path(app)?;
  if !p.exists() { return Ok(HashMap::new()); }
  let bytes = fs::read(p).map_err(|e| e.to_string())?;
  let map: HashMap<i64, AppMeta> = serde_json::from_slice(&bytes).unwrap_or_default();
  Ok(map)
}

fn save_meta_cache<R: Runtime>(app: &tauri::AppHandle<R>, map: &HashMap<i64, AppMeta>) -> Result<(), String> {
  let p = meta_cache_path(app)?;
  let data = serde_json::to_vec_pretty(map).map_err(|e| e.to_string())?;
  fs::write(p, data).map_err(|e| e.to_string())
}

fn ensure_basic_meta(lib: &Vec<LibraryGame>, meta: &mut HashMap<i64, AppMeta>) {
  for g in lib {
    meta.entry(g.appid).or_insert_with(|| {
      let name = g.name.to_lowercase();
      let mut genres: Vec<String> = Vec::new();

      let pairs: &[(&[&str], &str)] = &[
        (&["rpg", "souls", "witcher", "elder scrolls", "divinity"], "rpg"),
        (&["shoot", "doom", "cs", "counter-strike", "call of duty", "l4d", "left 4 dead"], "shooter"),
        (&["puzzle", "portal", "witness", "talos"], "puzzle"),
        (&["strategy", "civilization", "total war", "stellaris"], "strategy"),
        (&["action", "devil may cry", "bayonetta"], "action"),
        (&["platform", "ori", "hollow knight", "celeste"], "platformer"),
        (&["racing", "forza", "dirt", "need for speed"], "racing"),
        (&["survival", "raft", "forest", "don’t starve", "7 days"], "survival"),
        (&["horror", "resident evil", "amnesia", "outlast"], "horror"),
        (&["co-op", "coop", "overcooked", "it takes two", "payday", "borderlands"], "co-op"),
      ];
      for (keys, tag) in pairs {
        if keys.iter().any(|k| name.contains(k)) {
          genres.push((*tag).to_string());
        }
      }
      if genres.is_empty() { genres.push("misc".into()); }
      let coop = genres.iter().any(|g| g == "co-op");
      AppMeta { genres, coop }
    });
  }
}

fn build_profile(lib: &Vec<LibraryGame>, meta: &HashMap<i64, AppMeta>) -> PlayerProfile {
  let mut by_genre: HashMap<String, GenreStats> = HashMap::new();
  let mut total_unplayed = 0u32;
  let mut total_barely = 0u32;

  let mut sum_minutes: u64 = 0;
  let mut count_minutes: u64 = 0;
  let mut max_minutes: u32 = 0;

  for g in lib {
    if matches!(g.playtime_minutes, Some(0) | None) { total_unplayed += 1; }
    if let Some(m) = g.playtime_minutes {
      if m > 0 && m < 10 { total_barely += 1; }
      if m > 0 {
        sum_minutes += m as u64;
        count_minutes += 1;
        if m > max_minutes { max_minutes = m; }
      }
    }
    let genres = meta.get(&g.appid).map(|m| m.genres.clone()).unwrap_or_else(|| vec!["misc".into()]);
    for gn in genres {
      let e = by_genre.entry(gn.to_lowercase()).or_default();
      e.count += 1;
      e.minutes += g.playtime_minutes.unwrap_or(0) as u64;
    }
  }

  let avg_minutes = if count_minutes > 0 { (sum_minutes / count_minutes) as u32 } else { 120 };
  let max_minutes_nonzero = if max_minutes > 0 { max_minutes } else { 600 };

  let short_threshold = ((avg_minutes as f32 * 0.6).round() as u32).clamp(20, 120);
  let mut long_threshold = ((avg_minutes as f32 * 2.2).round() as u32).max(600);
  let cap = ((max_minutes_nonzero as f32) * 0.85).round() as u32;
  if long_threshold > cap { long_threshold = cap.max(300); }

  let mut pairs: Vec<(String, u64)> = by_genre.iter().map(|(k,v)|(k.clone(), v.minutes)).collect();
  pairs.sort_by(|a,b| b.1.cmp(&a.1));
  let top_genres = pairs.iter().take(5).map(|p| p.0.clone()).collect::<Vec<_>>();

  let mut rare_pairs = pairs.clone();
  rare_pairs.reverse();
  let rare_genres = rare_pairs.iter().take(5).map(|p| p.0.clone()).collect::<Vec<_>>();

  PlayerProfile {
    by_genre,
    rare_genres,
    top_genres,
    total_unplayed,
    total_barely_tried: total_barely,
    updated_at: chrono_now_u64(),
    avg_play_minutes: avg_minutes,
    max_play_minutes: max_minutes_nonzero,
    short_threshold,
    long_threshold,
  }
}

fn chrono_now_u64() -> u64 {
  use std::time::{SystemTime, UNIX_EPOCH};
  SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}


#[derive(Clone)]
struct CandRow {
  appid: i64,
  name: String,
  installed: bool,
  playmin: u32,            
  genres: Vec<String>,     
  score: f32,              
}

fn prefilter_candidates(lib: &Vec<LibraryGame>, meta: &HashMap<i64, AppMeta>, profile: &PlayerProfile) -> Vec<CandRow> {
  let mut rows: Vec<CandRow> = Vec::new();

  for g in lib {
    if g.name.trim().is_empty() { continue; }
    let genres = meta.get(&g.appid)
      .map(|m| m.genres.clone())
      .filter(|v| !v.is_empty())
      .unwrap_or_else(|| vec!["misc".into()]);
    let playmin = g.playtime_minutes.unwrap_or(0);

    let installed_bonus = if g.installed { 0.5 } else { 0.0 };
    let never_played = matches!(g.playtime_minutes, Some(0) | None);
    let never_bonus = if never_played { 0.4 } else { 0.0 };
    let barely_bonus = if playmin > 0 && playmin < 10 { 0.25 } else { 0.0 };

    let mut pref_sum = 0.0;
    for gn in &genres {
      if let Some(gs) = profile.by_genre.get(&gn.to_lowercase()) {
        pref_sum += ((gs.minutes as f32 + 1.0).ln()).min(8.0);
      }
    }
    if !genres.is_empty() { pref_sum /= genres.len() as f32; }

    let mut novelty = 0.0;
    for gn in &genres {
      if profile.rare_genres.iter().any(|r| r.eq_ignore_ascii_case(gn)) {
        novelty += 0.6;
      }
    }
    if !genres.is_empty() { novelty /= genres.len() as f32; }

    let score = 0.8 * pref_sum + 0.4 * novelty + installed_bonus + never_bonus + barely_bonus;

    rows.push(CandRow {
      appid: g.appid,
      name: g.name.clone(),
      installed: g.installed,
      playmin,
      genres,
      score,
    });
  }

  rows.sort_by(|a,b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

  let mut kept: Vec<CandRow> = Vec::new();
  let mut per_gen: HashMap<String, u32> = HashMap::new();

  for r in rows {
    let lead = r.genres.get(0).cloned().unwrap_or_else(|| "misc".into());
    let cnt = per_gen.entry(lead.clone()).or_insert(0);
    if *cnt >= 6 { continue; }
    kept.push(r);
    *cnt += 1;
    if kept.len() >= 20 { break; }
  }

  kept
}

fn make_profile_json(profile: &PlayerProfile) -> String {
  #[derive(Serialize)]
  struct P<'a> {
    top_gen: Vec<&'a str>,
    rare_gen: Vec<&'a str>,
    avg_min: u32,
    short_thr: u32,
    long_thr: u32,
    unplayed: u32,
    barely: u32,
  }
  let top_gen = profile.top_genres.iter().map(|s| s.as_str()).collect();
  let rare_gen = profile.rare_genres.iter().map(|s| s.as_str()).collect();

  let p = P {
    top_gen,
    rare_gen,
    avg_min: profile.avg_play_minutes,
    short_thr: profile.short_threshold,
    long_thr: profile.long_threshold,
    unplayed: profile.total_unplayed,
    barely: profile.total_barely_tried,
  };
  serde_json::to_string(&p).unwrap_or("{}".into())
}

fn make_candidates_tsv(cands: &[CandRow]) -> String {
  let mut s = String::from("appid\tname\tinstalled\n");
  for r in cands {
    let line = format!(
      "{}\t{}\t{}\n",
      r.appid,
      r.name.replace('\t', " ").replace('\n', " "),
      if r.installed { 1 } else { 0 },
    );
    s.push_str(&line);
  }
  s
}

fn build_llm_prompt(user_text: &str, profile_json: &str, candidates_tsv: &str) -> (String, String) {
  let system = "Ти — локальний асистент SteamGameHelper. Відповідай мовою користувача, лаконічно. \
  Із наданого профілю й кандидатів вибери 5–7 найкращих і поверни СТРОГО JSON: \
  {\"picks\":[{\"appid\":<number>,\"reason\":\"<<=120 символів>\"}, ...]}. \
  Не вигадуй ігор поза переліком. Причини конкретні (кооп/коротка/жанр/встановлено), без повторів.";

  let user = format!(
    "{}\n\n[profile]\n{}\n\n[candidates_tsv]\n{}",
    user_text.trim(),
    profile_json.trim(),
    candidates_tsv.trim()
  );

  (system.to_string(), user)
}


use crate::llm_backend; 

#[derive(Deserialize)]
pub struct ChatUserMsg { pub text: String }


#[tauri::command]
pub async fn llm_chat<R: Runtime>(app: tauri::AppHandle<R>, user: ChatUserMsg) -> Result<String, String> {
  let lib = load_library_cache(app.clone()).await.unwrap_or_default();
  if lib.is_empty() {
    return Err("Library is empty. Scan your library first.".into());
  }

  let mut meta = load_meta_cache(&app).unwrap_or_default();
  ensure_basic_meta(&lib, &mut meta);
  save_meta_cache(&app, &meta).ok();
  let profile = build_profile(&lib, &meta);

  let cands = prefilter_candidates(&lib, &meta, &profile);
  if cands.is_empty() {
    return Err("No candidates to recommend. Try scanning again.".into());
  }
  let profile_json = make_profile_json(&profile);
  let cands_tsv = make_candidates_tsv(&cands);

  let (system, user_prompt) = build_llm_prompt(&user.text, &profile_json, &cands_tsv);

  match llm_backend::answer(&system, &user_prompt) {
    Ok(text) => Ok(text),
    Err(e) => Err(format!("LLM error: {e}")),
  }
}
