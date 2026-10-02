const env = process.env;

// ---------- auth + error wrapper ----------
export function guard(handler, method = "POST") {
  return async (req, res) => {
    if (req.method !== method) return res.status(405).json({ error: "Method not allowed" });
    if (!env.ADMIN_PASSWORD || req.headers["x-admin-key"] !== env.ADMIN_PASSWORD)
      return res.status(401).json({ error: "Wrong or missing admin password" });
    try {
      await handler(req, res);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "site";

// ---------- Google Maps data via SerpApi (free plan, no card) ----------
async function serp(params) {
  const qs = new URLSearchParams({ ...params, api_key: env.SERPAPI_KEY });
  const r = await fetch(`https://serpapi.com/search.json?${qs}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("SerpApi: " + (d.error || r.status));
  return d;
}

const clean = (o) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("serpapi") && k !== "thumbnail"));

// 1 search credit. Returns up to 5 matches; the full record rides along in `raw`.
export async function placesSearch(query) {
  const d = await serp({ engine: "google_maps", q: query, type: "search", hl: "en" });
  const list = d.local_results || (d.place_results ? [d.place_results] : []);
  return list.slice(0, 5).map((p) => ({
    id: p.data_id || p.place_id,
    name: p.title,
    address: p.address,
    rating: p.rating,
    raw: p,
  }));
}

// Business data for the LLM prompt (no extra credit; comes from the search result).
export function buildBusiness(raw) {
  const b = clean(raw);
  b.maps_link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((raw.title || "") + " " + (raw.address || ""))}` +
    (raw.place_id ? `&query_place_id=${raw.place_id}` : "");
  return b;
}

// 1 credit for photos, plus 1 more if INCLUDE_REVIEWS=1.
export async function placeExtras(raw) {
  const max = Number(env.MAX_PHOTOS || 6);
  let imageUrls = [];
  try {
    const d = await serp({ engine: "google_maps_photos", data_id: raw.data_id });
    imageUrls = (d.photos || []).map((p) => p.image).filter(Boolean).slice(0, max);
  } catch { /* fall through to thumbnail */ }
  if (!imageUrls.length && raw.thumbnail) imageUrls = [raw.thumbnail];

  let reviews = [];
  if (env.INCLUDE_REVIEWS === "1") {
    try {
      const d = await serp({ engine: "google_maps_reviews", data_id: raw.data_id, hl: "en" });
      reviews = (d.reviews || []).slice(0, 5).map((r) => ({ rating: r.rating, author: r.user?.name, text: r.snippet || r.extracted_snippet?.original }));
    } catch { /* reviews are optional */ }
  }
  return { imageUrls, reviews };
}

// Image downloads go straight to Google's image CDN: no API credit used.
export async function downloadImages(urls) {
  const out = {};
  for (const [i, url] of urls.entries()) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      out[`images/photo${i + 1}.jpg`] = {
        data: Buffer.from(await r.arrayBuffer()).toString("base64"),
        encoding: "base64",
      };
    } catch { /* skip bad image */ }
  }
  return out;
}

// ---------- LLM (switch with LLM_PROVIDER=gemini | claude) ----------
const FORMAT_RULES = `Return ONLY files, each in this exact format, with no commentary and no markdown fences:
=== FILE: path/to/file.ext ===
<file contents>
Every file you want created or changed must appear in full. Paths are relative to the site root (e.g. index.html, css/style.css, api/contact.js).`;

async function callGemini(userPrompt) {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: FORMAT_RULES }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 32000 },
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Gemini call failed: " + JSON.stringify(d));
  return (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

async function callClaude(userPrompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 16000,
      system: FORMAT_RULES,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Claude call failed: " + JSON.stringify(d));
  return d.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

export async function generateFiles(userPrompt) {
  const text = (env.LLM_PROVIDER || "gemini") === "claude" ? await callClaude(userPrompt) : await callGemini(userPrompt);
  const files = {};
  for (const block of text.split(/^=== FILE: /m).slice(1)) {
    const nl = block.indexOf("\n");
    const name = block.slice(0, nl).replace(/\s*===\s*$/, "").trim();
    files[name] = block.slice(nl + 1).replace(/\n+$/, "") + "\n";
  }
  if (!Object.keys(files).length) throw new Error("Model returned no files:\n" + text.slice(0, 500));
  return files;
}

// ---------- Vercel deploy (creates/updates a separate project per client site) ----------
export async function deployToVercel(name, fileMap) {
  const files = Object.entries(fileMap).map(([file, f]) => ({ file, data: f.data, encoding: f.encoding }));
  const qs = env.DEPLOY_TEAM_ID ? `?teamId=${env.DEPLOY_TEAM_ID}` : "";
  const r = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.DEPLOY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, files, target: "production", projectSettings: { framework: null } }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Vercel deploy failed: " + JSON.stringify(d));
  // Prefer the stable project domain over the per-deployment URL
  const alias = (d.alias || []).find((a) => a.endsWith(".vercel.app"));
  return `https://${alias || name + ".vercel.app"}`;
}

export const textFile = (s) => ({ data: s, encoding: "utf-8" });
