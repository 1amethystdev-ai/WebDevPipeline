import { guard, downloadImages, prepareSite, textFile } from "../lib/shared.js";

// Returns every file of a saved site (text + photos) so the panel can zip it in the browser.
export default guard(async (req, res) => {
  const { job } = req.body;
  if (!job?.files) throw new Error("No saved site found for that name.");

  const text = {};
  for (const [k, v] of Object.entries(job.files)) text[k] = textFile(v);
  let images = await downloadImages(job.imageUrls || []); // no API credits used
  let skipped = [];

  // Vercel caps response size (about 4.5 MB). If the photos would push us over, send the links instead.
  const size = (o) => Object.values(o).reduce((n, f) => n + f.data.length, 0);
  if (size(images) + size(text) > 3_800_000) { skipped = job.imageUrls || []; images = {}; }

  res.json({ files: prepareSite({ ...images, ...text }, true), skipped });
});
