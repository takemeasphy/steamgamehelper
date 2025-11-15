export async function validateKey(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch(`${baseUrl.replace(/\/+$/,"")}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
      }),
    });
    if (resp.ok) return { ok: true };
    const txt = await resp.text();
    return { ok: false, error: `HTTP ${resp.status}: ${txt.slice(0, 200)}` };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
