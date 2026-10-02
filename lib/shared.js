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

// ---------- Google Places ----------
export async function placesSearch(query) {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Places search failed: " + JSON.stringify(d));
  return (d.places || []).map((p) => ({
    id: p.id,
    name: p.displayName?.text,
    address: p.formattedAddress,
    rating: p.rating,
  }));
}

export async function placeDetails(placeId) {
  const fields = [
    "id", "displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri",
    "googleMapsUri", "rating", "userRatingCount", "primaryTypeDisplayName",
    "editorialSummary", "regularOpeningHours.weekdayDescriptions", "reviews", "photos",
  ].join(",");
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": env.GOOGLE_API_KEY, "X-Goog-FieldMask": fields },
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Place details failed: " + JSON.stringify(d));
  const { photos, ...business } = d;
  return { business, photos: photos || [] };
}

// Photos are the tightest free quota (1,000/month). Lower MAX_PHOTOS to stretch it.
export async function downloadPhotos(photos, max = Number(env.MAX_PHOTOS || 6)) {
  const out = {};
  for (const [i, p] of photos.slice(0, max).entries()) {
    const r = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=1200&key=${env.GOOGLE_API_KEY}`);
    if (!r.ok) continue;
    out[`images/photo${i + 1}.jpg`] = {
      data: Buffer.from(await r.arrayBuffer()).toString("base64"),
      encoding: "base64",
    };
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
