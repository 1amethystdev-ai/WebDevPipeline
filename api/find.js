import { guard, placesSearch } from "../lib/shared.js";

export default guard(async (req, res) => {
  res.json({ places: await placesSearch(req.body.query) });
});
