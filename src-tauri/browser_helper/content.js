(function () {
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
})();