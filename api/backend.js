import { guard, slug, downloadImages, generateFiles, deployToVercel, textFile } from "../lib/shared.js";

export default guard(async (req, res) => {
  const { job, prompt, notes } = req.body; // job = { name, business, imageUrls, files } saved by the panel
  if (!job?.files || !job?.business) throw new Error("Build the frontend first (no saved site found).");

  const images = await downloadImages(job.imageUrls || []); // no search credits used here

  const existing = Object.entries(job.files).map(([k, v]) => `=== FILE: ${k} ===\n${v}`).join("\n");
  const userPrompt = `${prompt}

CLIENT NOTES / REQUIREMENTS FOR THE BACKEND:
${notes || "(none)"}

BUSINESS DATA:
${JSON.stringify(job.business, null, 2)}

EXISTING FRONTEND FILES (the client approved this; do not redesign it, only change what is needed to connect it to the backend):
${existing}`;

  const generated = await generateFiles(userPrompt);
  const merged = { ...job.files, ...generated };

  const fileMap = { ...images };
  for (const [k, v] of Object.entries(merged)) fileMap[k] = textFile(v);

  const url = await deployToVercel(slug(job.name), fileMap);
  res.json({ url, changed: Object.keys(generated), files: merged });
});
