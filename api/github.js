import { guard, slug, downloadImages, pushToGitHub, textFile } from "../lib/shared.js";

// Manual "Save to GitHub" for a site already saved in the panel.
export default guard(async (req, res) => {
  const { job } = req.body;
  if (!job?.files) throw new Error("No saved site found for that name.");
  if (!process.env.GITHUB_TOKEN) throw new Error("Set GITHUB_TOKEN in your Vercel environment variables first.");

  const images = await downloadImages(job.imageUrls || []);
  const fileMap = { ...images };
  for (const [k, v] of Object.entries(job.files)) fileMap[k] = textFile(v);

  res.json({ github: await pushToGitHub(slug(job.name), fileMap, "Manual save from panel") });
});
