// ============================================================
// PUT YOUR TWO PROMPTS HERE. Keep the outer backticks. NEVER type a
// backtick or a dollar-brace sequence inside the text: it breaks this file
// and the panel can no longer load the prompts.
// ============================================================

// PROMPT 1: frontend demo (used first, before the client pays)
export const FRONTEND_PROMPT = `
<role>
You are the design lead at a small studio that builds websites for design-led businesses. Every site you ship has its own visual identity and is never mistaken for a template or for another site you've built. Follow the attached frontend-design skill, including its two-pass process: design plan, critique against the brief, revise, then build.
</role>

<goal>
Build a front-end-only demo site to show a prospective client in a sales call. It must look like their finished site, with believable content from their real details. No backend.
Business type: interior design studio.
</goal>

<client_info>
Client details are at the end of this message under BUSINESS DATA (Google Maps JSON) and IMAGES AVAILABLE. They may be messy or partial.
1. Extract a compact block: studio name, city/areas, founders, services, project types, style cues, notable projects, contact details, socials, tone of voice, anything distinctive about how they work.
2. Use these details everywhere: copy, project names, locations, contact info, and the design direction itself.
3. Invent believable placeholders for gaps and list each as a one-line assumption. Never invent facts that could embarrass the client (awards, named clients, certifications, years in business).
4. Do not ask questions. Proceed.
</client_info>

<colour>
Use the business's own colours (logo, photos, listing, socials). If none can be found, derive a palette from the supplied photos; if there are no photos, choose a distinctive palette from their city, materials and style. Give 4-6 named hex values.
</colour>

<uniqueness>
This site must not resemble any other you would build for a similar client. Before designing:
1. Name the identity hooks: 3 specific things from this client's city, materials, founder, photos or way of working that no other studio has.
2. Choose each of these deliberately from those hooks, not from habit: hero device, layout archetype (e.g. plan-led, material-swatch-led, single-room-per-scroll, index/ledger, horizontal film strip), type pairing, grid and spacing rhythm, navigation style, image treatment, motion idea.
3. Avoid the skill's listed defaults, and avoid any font pair, hero, or layout you would reach for on a typical interior-studio brief.
4. In NOTES.md, add a "Why this isn't another studio's site" paragraph naming the hooks and the choices they drove. If the plan reads as interchangeable with another studio, revise it before building.
</uniqueness>

<principles>
1. Project imagery dominates; copy is minimal, plain and specific (real areas, services, voice). No filler like "crafting spaces that inspire".
2. Design vocabulary comes from interiors: materials, textures, plans, swatches, joinery, light. No SaaS patterns.
3. One memorable element; everything else stays quiet.
</principles>

<pages>
- Home: hero, featured projects, short intro, services, testimonials, enquiry CTA
- Projects: filterable gallery (residential / commercial / room type)
- Project detail: full-bleed images, brief, scope, area, location, materials, before/after slider
- Services and process: what they do and a real step sequence (numbering allowed here)
- About: founder(s), approach
- Contact: form (name, phone, project type, location, budget range, timeline, message) and WhatsApp click-to-chat
</pages>

<demo_features>
1. Real photos: use the exact paths under IMAGES AVAILABLE. If none, build CSS/inline-SVG placeholders with correct aspect ratios, designed for real photography.
2. Private demo: noindex meta, Open Graph tags with a generated og.svg (1200x630), SVG favicon from their initials.
3. /estimate: inputs (property type, area or BHK, finish level) → price range from a rate table in js/content.js. Ask for name and phone to reveal it. State it is approximate.
4. Every project page has "Want something like this?" opening the form prefilled with that project. WhatsApp links carry a prefilled message with the page/project name.
5. /admin-preview (not in nav): static branded mock dashboard labelled "Preview", with sample enquiries in a pipeline (new → contacted → site visit → quote sent → won) and an "add project" screen.
6. /proposal (not in nav): one-page private proposal with inclusions, timeline and 3 pricing tiers from js/content.js.
7. Quality gate: check at 375px and 1440px, Lighthouse mobile ≥ 90, no layout shift, alt text on all images, and no leftover "Studio Name", "Lorem" or "TODO". Pass the three-second test: what is this, whose is it, what do I do next.
</demo_features>

<technical>
- Static site: plain HTML, CSS, vanilla JS. No framework, build step, npm or TypeScript. index.html at the root.
- Files: index, projects, project (reads id from query string), services, about, contact, estimate, admin-preview, proposal (.html). Link without extensions (/projects, /estimate).
- All content in js/content.js as window.SITE (name, tagline, colours, fonts, contact, projects, services, testimonials, rate table, tiers). Shared rendering in js/app.js; colours and fonts applied as CSS variables. All styles in css/style.css. Rebranding means editing only content.js and swapping images.
- Google Fonts allowed with a good system fallback. No external image URLs.
- Form: front-end validation, confirmation state on submit.
- Mobile-first, keyboard-focusable, reduced motion respected, no heavy libraries.
- Budget: whole reply under about 24,000 tokens. 4 sample projects, lean pages.
</technical>

<process>
1. Write NOTES.md (not deployed): extracted client block, identity hooks, design plan (palette, type roles, layout concept with ASCII wireframes, principles), critique and changes, uniqueness paragraph, assumptions, and at the end how to run and what to swap.
2. Build the site files.
3. The reply contains ONLY files in the required format. No text before, between or after them.
</process>
`;

// PROMPT 2: backend (used only after the client approves the frontend)
export const BACKEND_PROMPT = `
<context>
Extend the attached static demo site (plain HTML, CSS and vanilla JavaScript) into a production site for the client described at the end of this message. Keep the existing design and visual identity intact. Replace the placeholder data in js/content.js with a real backend the client can manage without a developer. Change only the files that need to change and output each changed or new file in full.
</context>

<client_info_handling>
The client's details and any new requirements are given under CLIENT NOTES and BUSINESS DATA at the end of this message (real project data, contact details, admin email, WhatsApp number, domain, special requests). Extract them first and list them in a compact block. Use them to seed the database and configure the site. If something is missing, use a clearly marked placeholder in .env.example or seed data and list it under "Needs from client". Do not ask me questions. Proceed.
</client_info_handling>

<stack>
Supabase (Postgres, Auth, Storage), Resend for email, deployed on Vercel. The site stays static HTML/CSS/JS. Server logic lives in Vercel serverless functions in the api folder (Node, ES modules, one file per route, default-exported handler), with dependencies listed in package.json. The admin panel is static pages under /admin that talk to Supabase with the public anon key under Row Level Security, or to the api routes. Never expose service keys client-side.
</stack>

<requirements>
1. Database: tables for projects, project_images (ordered, with alt text), categories, services, testimonials, enquiries, site_settings. Include SQL migrations.
2. Row Level Security: public reads published content only; public can insert enquiries only; everything else requires an authenticated admin.
3. Admin panel at /admin (email + password, single admin role):
   - Projects: create/edit/delete, drag-to-reorder images, upload to Storage (auto-resize and compress), publish/unpublish, mark as featured
   - Enquiries: list with status (new / contacted / site visit / quote sent / won / lost), notes, filter, CSV export
   - Testimonials, services, site settings (contact details, social links, WhatsApp number, hero content)
4. Enquiry flow: server-side validation (zod), honeypot + rate limiting, save to DB, email notification to the studio, auto-reply to the visitor. Never expose service keys client-side.
5. Public pages read published content from the DB at load time (through an api route with short cache headers) and fall back to js/content.js if the call fails.
6. SEO: per-page metadata, Open Graph images from project covers, sitemap.xml, robots.txt, LocalBusiness JSON-LD, clean slugs.
7. Performance: images with width and height attributes and lazy loading, target Lighthouse 90+ on mobile.
8. Seed script that loads the client's real details from the block above, plus demo projects if real ones aren't provided.
9. Estimator backend: rate table editable in admin; every estimator submission saved as a lead with the range shown.
10. Source tracking: store UTM/referrer on each enquiry so the client sees which leads came from Instagram vs Google vs direct.
11. Lightweight privacy-friendly analytics, with an admin dashboard showing visits → enquiries → won, by week.
12. Notifications: email on every new enquiry, plus a weekly summary email (enquiries received, by type and budget band).
</requirements>

<process>
Work in this order, verifying each step runs before moving on: schema + RLS, seed, public pages wired to DB, enquiry flow, admin auth, admin CRUD, SEO, deploy notes. State assumptions briefly and proceed.
</process>

<deliverables>
Full code, a .env.example file, SQL migrations as .sql files, README.md with setup and deploy steps and a "Needs from client" list, and HANDOVER.md as a one-page guide for a non-technical client (how to add a project, how to read enquiries). Your reply must contain ONLY files in the required file format, with no text outside them.
</deliverables>
`;
