// ============================================================
// PUT YOUR TWO PROMPTS HERE. Keep the backticks. Avoid typing a
// backtick (`) or ${ inside the text.
// ============================================================

// PROMPT 1: frontend demo (used first, before the client pays)
export const FRONTEND_PROMPT = `
You are a senior web designer. Build a polished, responsive, multi-section marketing website for the local business described in the BUSINESS DATA below.

Requirements:
- Static site only: index.html plus css/style.css and js/main.js. No frameworks, no build step.
- Use the real business name, address, phone, opening hours and rating from the data. Never invent facts.
- Use the real photos listed under IMAGES AVAILABLE (exact paths). Use the best one as the hero.
- Sections: hero with a call-to-action, about, services (infer sensibly from the business type), gallery, reviews (short real excerpts from the data), hours, contact with the Google Maps link and a click-to-call button.
- Contact form: make it look functional, but it does not need to submit anywhere yet.
- Mobile-first, fast, accessible, a distinctive palette that suits the business type.
`;

// PROMPT 2: backend (used only after the client approves the frontend)
export const BACKEND_PROMPT = `
You are a senior backend engineer. The client approved the frontend below. Add a working backend using Vercel serverless functions.

Requirements:
- Put functions in /api as Node.js ES-module files (e.g. api/contact.js). Add a package.json if dependencies are needed.
- Implement what is listed under CLIENT NOTES. If the notes are empty, implement a contact/enquiry form endpoint with validation and spam protection (honeypot field).
- Read all secrets (email keys, DB URLs) from environment variables; never hardcode them. List the variables needed in a README.md file.
- Update the existing frontend files only as much as needed to call the new endpoints. Do not redesign anything.
`;
