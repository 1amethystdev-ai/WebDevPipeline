import { guard, slug, buildBusiness, placeExtras, downloadImages, generateFiles, SCOPES, deployToVercel, textFile, prepareSite, pushToGitHub } from "../lib/shared.js";

export default guard(async (req, res) => {
  const { place, siteName, prompt, scope = "one" } = req.body; // place = the record picked from the search results
  if (!place?.data_id || !siteName || !prompt) throw new Error("place, siteName and prompt are required");

  const business = buildBusiness(place);
  const { imageUrls, reviews } = await placeExtras(place);
  if (reviews.length) business.reviews_sample = reviews;
  const images = await downloadImages(imageUrls);

  const sc = SCOPES[scope] || SCOPES.one;
  const userPrompt = `${prompt}

BUSINESS DATA (from Google Maps, JSON):
${JSON.stringify(business, null, 2)}

IMAGES AVAILABLE in the site (use these exact paths, they are real photos of the business):
${Object.keys(images).map((p) => "/" + p).join("\n") || "(none, use CSS/SVG placeholders)"}${sc.instruction ? "\n\n" + sc.instruction : ""}`;

  const generated = await generateFiles(userPrompt, { maxTokens: sc.maxTokens });
  const fileMap = { ...images };
  for (const [k, v] of Object.entries(generated)) fileMap[k] = textFile(v);

  const name = slug(siteName);
  const url = await deployToVercel(name, prepareSite(fileMap));
  // Best-effort backup: a GitHub failure never fails the build.
  let github = null, githubError = null;
  try { github = await pushToGitHub(name, fileMap, `Frontend demo for ${siteName}`); } catch (e) { githubError = e.message; }
  // The panel also keeps these in your browser for the backend step.
  res.json({ url, name, business, imageUrls, files: generated, github, githubError });
});
