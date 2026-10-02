import { guard, slug, placeDetails, downloadPhotos, generateFiles, deployToVercel, textFile } from "../lib/shared.js";

export default guard(async (req, res) => {
  const { placeId, siteName, prompt } = req.body;
  if (!placeId || !siteName || !prompt) throw new Error("placeId, siteName and prompt are required");

  const { business, photos } = await placeDetails(placeId);
  const images = await downloadPhotos(photos);

  const userPrompt = `${prompt}

BUSINESS DATA (from Google Maps, JSON):
${JSON.stringify(business, null, 2)}

IMAGES AVAILABLE in the site (use these exact paths, they are real photos of the business):
${Object.keys(images).map((p) => "/" + p).join("\n") || "(none, use CSS/SVG placeholders)"}`;

  const generated = await generateFiles(userPrompt);
  const fileMap = { ...images };
  for (const [k, v] of Object.entries(generated)) fileMap[k] = textFile(v);

  const name = slug(siteName);
  const url = await deployToVercel(name, fileMap);
  // The server stores nothing: the panel keeps these files in your browser for the backend step.
  res.json({ url, name, placeId, files: generated });
});
