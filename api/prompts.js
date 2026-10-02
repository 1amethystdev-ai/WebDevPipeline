import { guard } from "../lib/shared.js";
import { FRONTEND_PROMPT, BACKEND_PROMPT } from "../lib/prompts.js";

export default guard(async (req, res) => {
  res.json({ frontend: FRONTEND_PROMPT.trim(), backend: BACKEND_PROMPT.trim() });
}, "GET");
