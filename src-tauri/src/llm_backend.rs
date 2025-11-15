use std::{
  fs,
  path::{Path, PathBuf},
  sync::{Mutex, OnceLock},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode { Disabled, Enabled }

// ====== ваш абсолютний шлях до .gguf (за потреби змініть) ======
#[cfg(windows)]
const HARDCODED_MODEL_FILE: &str = r#"C:\Users\AMD\Desktop\SteamGameHelper\apps\desktop\src-tauri\resources\models\Llama-3.2-3B-Instruct-Q3_K_M.gguf"#;
#[cfg(not(windows))]
const HARDCODED_MODEL_FILE: &str = r#""#;

static MODEL_PATH: OnceLock<PathBuf> = OnceLock::new();

fn exe_dir() -> PathBuf {
  std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(|d| d.to_path_buf()))
    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn hardcoded_model_file() -> Option<PathBuf> {
  if !HARDCODED_MODEL_FILE.trim().is_empty() {
    let p = PathBuf::from(HARDCODED_MODEL_FILE);
    if p.is_file() && p.extension().and_then(|s| s.to_str()) == Some("gguf") {
      return Some(p);
    }
  }
  None
}

fn env_model_file() -> Option<PathBuf> {
  let raw = std::env::var("SGH_MODEL_FILE").ok()?;
  let p = PathBuf::from(raw);
  if p.is_file() && p.extension().and_then(|s| s.to_str()) == Some("gguf") {
    Some(p)
  } else {
    None
  }
}

fn candidate_dirs() -> Vec<PathBuf> {
  if let Ok(p) = std::env::var("SGH_MODELS_DIR") {
    return vec![PathBuf::from(p)];
  }
  let mut v = vec![exe_dir().join("resources").join("models")];
  if let Ok(cwd) = std::env::current_dir() {
    v.push(cwd.join("src-tauri").join("resources").join("models"));
  }
  v
}

fn find_any_gguf(dir: &Path) -> Option<PathBuf> {
  let entries = fs::read_dir(dir).ok()?;
  for e in entries.flatten() {
    let p = e.path();
    if p.is_file() && p.extension().and_then(|s| s.to_str()) == Some("gguf") {
      return Some(p);
    }
  }
  None
}

fn pick_model() -> Option<PathBuf> {
  if let Some(p) = hardcoded_model_file() { return Some(p); }
  if let Some(p) = env_model_file()      { return Some(p); }
  for d in candidate_dirs() {
    if let Some(p) = find_any_gguf(&d) { return Some(p); }
  }
  None
}

pub fn init_if_available() -> Mode {
  if MODEL_PATH.get().is_some() { return Mode::Enabled; }
  match pick_model() {
    Some(p) => { let _ = MODEL_PATH.set(p); Mode::Enabled }
    None => Mode::Disabled,
  }
}

// ---------- авто-тюнінг під залізо ----------

#[derive(Clone, Copy, Debug)]
struct HwTuning {
  n_threads: usize,
  n_ctx: usize,
  n_batch: usize,
  max_tokens: usize,
  wall_time_ms: u64,
}

fn parse_env_usize(key: &str) -> Option<usize> {
  std::env::var(key).ok()?.trim().parse().ok()
}
fn parse_env_u64(key: &str) -> Option<u64> {
  std::env::var(key).ok()?.trim().parse().ok()
}

fn hardware_tuning() -> HwTuning {
  use sysinfo::System; // ⬅️ лише System, без SystemExt у v0.30

  let mut sys = System::new_all();
  sys.refresh_memory();

  // total_memory() у 0.30 повертає KiB
  let total_mem_gib: u64 = sys.total_memory() / 1024 / 1024;
  let cores = num_cpus::get();

  let mut tune = HwTuning {
    n_threads: cores.clamp(2, 16),
    n_ctx: 3072,
    n_batch: 512,
    max_tokens: 96,
    wall_time_ms: 6000,
  };

  if total_mem_gib < 8 {
    tune.n_ctx = 2048;
    tune.n_batch = 256;
    tune.max_tokens = 64;
    tune.wall_time_ms = 5000;
  } else if total_mem_gib >= 16 {
    tune.n_ctx = 4096;
    tune.n_batch = 1024;
    tune.max_tokens = 128;
    tune.wall_time_ms = 8000;
  }

  if let Some(v) = parse_env_usize("SGH_THREADS")     { tune.n_threads = v.max(1); }
  if let Some(v) = parse_env_usize("SGH_CTX")         { tune.n_ctx = v.max(512); }
  if let Some(v) = parse_env_usize("SGH_BATCH")       { tune.n_batch = v.max(32); }
  if let Some(v) = parse_env_usize("SGH_MAXTOK")      { tune.max_tokens = v.max(16); }
  if let Some(v) = parse_env_u64  ("SGH_WALLTIME_MS") { tune.wall_time_ms = v.max(1000); }

  tune
}

#[cfg(feature = "llm")]
mod inner {
  use super::*;
  use std::time::{Duration, Instant};
  use llama_cpp::{LlamaModel, LlamaParams, SessionParams};
  use llama_cpp::standard_sampler::StandardSampler;

  static MODEL: OnceLock<Mutex<Option<LlamaModel>>> = OnceLock::new();

  fn ensure_loaded() -> Result<(), String> {
    MODEL.get_or_init(|| Mutex::new(None));

    if super::MODEL_PATH.get().is_none() {
      if let Some(p) = super::pick_model() {
        let _ = super::MODEL_PATH.set(p);
      }
    }
    let path = super::MODEL_PATH
      .get()
      .ok_or("Model path not set")?
      .to_string_lossy()
      .to_string();

    {
      let g = MODEL.get().unwrap().lock().map_err(|_| "LLM mutex poisoned")?;
      if g.is_some() { return Ok(()); }
    }

    let model = LlamaModel::load_from_file(&path, LlamaParams::default())
      .map_err(|e| e.to_string())?;

    let mut g = MODEL.get().unwrap().lock().map_err(|_| "LLM mutex poisoned")?;
    *g = Some(model);
    Ok(())
  }

  fn feed_prompt_in_chunks<F>(mut advance: F, prompt: &str) -> Result<(), String>
  where
    F: FnMut(&str) -> Result<(), String>,
  {
    const CHUNK: usize = 2000;
    if prompt.len() <= CHUNK {
      return advance(prompt);
    }
    let mut start = 0;
    while start < prompt.len() {
      let end = (start + CHUNK).min(prompt.len());
      let mut cut = end;
      if end < prompt.len() {
        if let Some(prev_nl) = prompt[start..end].rfind('\n') {
          cut = start + prev_nl + 1;
        } else if let Some(prev_sp) = prompt[start..end].rfind(' ') {
          cut = start + prev_sp + 1;
        }
      }
      if cut <= start { cut = end; }
      advance(&prompt[start..cut])?;
      start = cut;
    }
    Ok(())
  }

  pub fn answer(system_prompt: &str, user_prompt: &str) -> Result<String, String> {
    ensure_loaded()?;

    let t = super::hardware_tuning();

    let mut sp = SessionParams::default();
    sp.n_ctx   = t.n_ctx as u32;    // ⬅️ каст до u32
    sp.n_batch = t.n_batch as u32;  // ⬅️ каст до u32
    #[allow(unused_variables)]
    {
      let _ = t.n_threads;
      // якщо у вашій версії є поле:
      // sp.n_threads = t.n_threads as u32;
    }

    let mut g = MODEL.get().unwrap().lock().map_err(|_| "LLM mutex poisoned".to_string())?;
    let model = g.as_mut().ok_or("LLM not loaded")?;
    let mut session = model.create_session(sp).map_err(|e| e.to_string())?;

    let prompt = format!(
      "<|system|>{}<|end|><|user|>{}<|end|><|assistant|>",
      system_prompt.trim(),
      user_prompt.trim()
    );

    feed_prompt_in_chunks(|chunk| session.advance_context(chunk).map_err(|e| e.to_string()), &prompt)?;

    let sampler = StandardSampler::default();
    let handle = session
      .start_completing_with(sampler, t.max_tokens)
      .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + Duration::from_millis(t.wall_time_ms);
    let mut out = String::new();

    for piece in handle.into_strings() {
      out.push_str(&piece);
      if out.contains("<|end|>") { break; }
      if Instant::now() >= deadline { break; }
      if out.len() > 12_000 { break; }
    }

    let out = out.split("<|end|>").next().unwrap_or(&out).trim().to_string();
    Ok(out)
  }
}

#[cfg(not(feature = "llm"))]
mod inner {
  pub fn answer(_system_prompt: &str, _user_prompt: &str) -> Result<String, String> {
    Err("LLM feature disabled (run with --features llm)".into())
  }
}

pub use inner::answer;
