import { guard, slug, buildBusiness, placeExtras, downloadImages, generateFiles, deployToVercel, textFile, prepareSite } from "../lib/shared.js";

export default guard(async (req, res) => {
  const { place, siteName, prompt } = req.body; // place = the record picked from the search results
  if (!place?.data_id || !siteName || !prompt) throw new Error("place, siteName and prompt are required");

  const business = buildBusiness(place);
  const { imageUrls, reviews } = await placeExtras(place);
  if (reviews.length) business.reviews_sample = reviews;
  const images = await downloadImages(imageUrls);

  const userPrompt = `${prompt}

BUSINESS DATA (from Google Maps, JSON):
${JSON.stringify(business, null, 2)}

IMAGES AVAILABLE in the site (use these exact paths, they are real photos of the business):
${Object.keys(images).map((p) => "/" + p).join("\n") || "(none, use CSS/SVG placeholders)"}`;

  const generated = await generateFiles(userPrompt);
  const fileMap = { ...images };
  for (const [k, v] of Object.entries(generated)) fileMap[k] = textFile(v);

  const name = slug(siteName);
  const url = await deployToVercel(name, prepareSite(fileMap));
  // The server stores nothing: the panel keeps these in your browser for the backend step.
  res.json({ url, name, business, imageUrls, files: generated });
});
