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

export const textFile = (s) => ({ data: s, encoding: "utf-8" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const TRUNCATED = "The model ran out of output space mid-site, so nothing was deployed. Shorten the prompt or ask for fewer pages, then retry.";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
let modelCache = { at: 0, list: null };

// Ask Google which models exist right now, so nothing is hardcoded.
// Picks the newest Flash models (best free-tier fit), newest version first,
// stable before preview at the same version, Flash-Lite last.
async function geminiModels() {
  if (modelCache.list && Date.now() - modelCache.at < 6 * 3600e3) return modelCache.list;
  let list = [];
  try {
    const r = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
    const d = await r.json();
    const BAD = /image|tts|live|embed|audio|robotics|computer-use|aqa|learnlm|gemma|(^|-)exp(-|$)/i;
    for (const m of d.models || []) {
      const id = (m.name || "").replace(/^models\//, "");
      if (!id.startsWith("gemini-") || BAD.test(id)) continue;
      if (!(m.supportedGenerationMethods || []).includes("generateContent")) continue;
      const mt = id.match(/^gemini-(\d+(?:\.\d+)?)-(flash-lite|flash)(?:-(.*))?$/);
      if (!mt) continue; // skips Pro and the "-latest" aliases
      if (mt[3] && !/preview/.test(mt[3])) continue; // skips dated duplicates like -001
      list.push({ id, version: parseFloat(mt[1]), lite: mt[2] === "flash-lite", preview: /preview/.test(mt[3] || ""), limit: m.outputTokenLimit });
    }
    list.sort((a, b) => a.lite - b.lite || b.version - a.version || a.preview - b.preview);
    list = list.slice(0, 6);
  } catch { /* use fallback below */ }
  if (!list.length) list = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"].map((id) => ({ id }));
  modelCache = { at: Date.now(), list };
  return list;
}

// Tries each model in turn, retrying overloaded (503) ones once, then moves on.
async function callGemini(userPrompt) {
  const started = Date.now();
  const preferred = (env.GEMINI_MODEL || "").split(",").map((x) => x.trim()).filter(Boolean).map((id) => ({ id }));
  const models = [...preferred, ...(await geminiModels())];
  const tried = [];

  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - started > 150000) break; // leave room inside Vercel's time limit
      let r = null, d = null;
      try {
        r = await fetch(`${GEMINI}/models/${m.id}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: FORMAT_RULES }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: Math.min(32000, m.limit || 32000) },
          }),
        });
        d = await r.json();
      } catch (e) {
        tried.push(`${m.id}: network error`);
        await sleep(1500);
        continue;
      }
      if (r.ok) {
        if (d.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error(TRUNCATED);
        const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        if (text.trim()) return text;
        tried.push(`${m.id}: empty response (${d.candidates?.[0]?.finishReason || "unknown"})`);
        break; // next model
      }
      tried.push(`${m.id}: ${r.status} ${d?.error?.status || ""}`);
      if (r.status === 401 || r.status === 403) throw new Error("Gemini rejected the API key: " + (d?.error?.message || r.status));
      if (r.status === 503 || r.status === 500 || r.status === 504) {
        if (attempt === 0) { await sleep(2500); continue; } // one retry, then next model
        break;
      }
      break; // 404 (model gone), 429 (that model's quota), 400, etc: next model
    }
  }
  if (env.ANTHROPIC_API_KEY) return callClaude(userPrompt); // optional paid last resort
  throw new Error("All Gemini models failed. Tried: " + tried.join(" | ") + ". Wait a minute and press the button again.");
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
      max_tokens: 32000,
      system: FORMAT_RULES,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Claude call failed: " + JSON.stringify(d));
  if (d.stop_reason === "max_tokens") throw new Error(TRUNCATED);
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

// ---------- Last checks before upload ----------
// Drops notes, makes /estimate etc. work without .html, refuses to deploy a site with no home page.
export function prepareSite(fileMap, keepNotes = false) {
  const out = { ...fileMap };
  if (!keepNotes) delete out["NOTES.md"];
  if (!out["index.html"]) {
    throw new Error("The model did not produce index.html, so the deployed site would be a 404. Files it returned: " + Object.keys(out).join(", "));
  }
  let cfg = {};
  try { if (out["vercel.json"]) cfg = JSON.parse(out["vercel.json"].data); } catch { /* replace broken config */ }
  out["vercel.json"] = textFile(JSON.stringify({ ...cfg, cleanUrls: true }, null, 2));
  return out;
}

// ---------- GitHub backup (optional: only runs when GITHUB_TOKEN is set) ----------
// One private repo per site, named after the site. Re-running adds a new commit on top.
async function gh(path, method = "GET", body) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "site-pipeline",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`GitHub ${method} ${path} failed (${r.status}): ${d.message || ""}`);
    e.status = r.status;
    throw e;
  }
  return d;
}

export async function pushToGitHub(name, rawFileMap, message) {
  if (!env.GITHUB_TOKEN) return null;
  const files = prepareSite(rawFileMap, true); // keeps NOTES.md in the repo, adds vercel.json
  const me = (await gh("/user")).login;
  const owner = env.GITHUB_OWNER || me;
  const repo = slug(name);

  let info;
  try {
    info = await gh(`/repos/${owner}/${repo}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    const createPath = owner.toLowerCase() === me.toLowerCase() ? "/user/repos" : `/orgs/${owner}/repos`;
    info = await gh(createPath, "POST", { name: repo, private: true, auto_init: true, description: "Generated by site pipeline" });
  }
  const ref = `heads/${info.default_branch || "main"}`;

  let head;
  for (let i = 0; i < 5; i++) { // a freshly created repo can take a moment to have its first commit
    try { head = (await gh(`/repos/${owner}/${repo}/git/ref/${ref}`)).object.sha; break; }
    catch (e) { if (i === 4) throw e; await sleep(1000); }
  }
  const headCommit = await gh(`/repos/${owner}/${repo}/git/commits/${head}`);

  const entries = [];
  const paths = Object.keys(files);
  for (let i = 0; i < paths.length; i += 5) {
    await Promise.all(paths.slice(i, i + 5).map(async (path) => {
      const f = files[path];
      const blob = await gh(`/repos/${owner}/${repo}/git/blobs`, "POST", {
        content: f.data,
        encoding: f.encoding === "base64" ? "base64" : "utf-8",
      });
      entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
    }));
  }
  const tree = await gh(`/repos/${owner}/${repo}/git/trees`, "POST", { base_tree: headCommit.tree.sha, tree: entries });
  const commit = await gh(`/repos/${owner}/${repo}/git/commits`, "POST", { message: message || "Update site", tree: tree.sha, parents: [head] });
  await gh(`/repos/${owner}/${repo}/git/refs/${ref}`, "PATCH", { sha: commit.sha });
  return `https://github.com/${owner}/${repo}`;
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

  // Wait for the deployment to finish so a failed build is reported here instead of showing up later as a 404.
  const authHeaders = { Authorization: `Bearer ${env.DEPLOY_TOKEN}` };
  const qsAnd = qs ? qs : "";
  let state = d.readyState;
  for (let i = 0; i < 15 && state !== "READY"; i++) {
    if (state === "ERROR" || state === "CANCELED") break;
    await sleep(2000);
    const st = await fetch(`https://api.vercel.com/v13/deployments/${d.id}${qsAnd}`, { headers: authHeaders }).then((x) => x.json()).catch(() => ({}));
    state = st.readyState || state;
    if (state === "ERROR") d.errorMessage = st.errorMessage || st.error?.message;
  }
  if (state === "ERROR" || state === "CANCELED")
    throw new Error(`Vercel build ${state}: ${d.errorMessage || "open the project's Deployments tab > Build Logs"}. Files uploaded: ${files.map((f) => f.file).join(", ")}`);

  // Client demos must open without a Vercel login. New projects get Vercel Authentication by default; switch it off (best effort).
  try {
    await fetch(`https://api.vercel.com/v9/projects/${d.projectId || name}${qsAnd}`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ssoProtection: null }),
    });
  } catch { /* the deploy still succeeded */ }

  // Prefer the stable project domain over the per-deployment URL
  const alias = (d.alias || []).find((a) => a.endsWith(".vercel.app"));
  return `https://${alias || name + ".vercel.app"}`;
}
