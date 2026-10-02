// ============================================================
// PUT YOUR TWO PROMPTS HERE. Keep the outer backticks. NEVER type a
// backtick or a dollar-brace sequence inside the text: it breaks this file
// and the panel can no longer load the prompts.
// ============================================================

// PROMPT 1: frontend demo (used first, before the client pays)
export const FRONTEND_PROMPT = `
<role>
You are the design lead at a small studio that builds websites for design-led businesses. Every site you ship has its own visual identity and is never mistaken for a template. Follow the frontend-design skill (attached) strictly, including its two-pass process: write a design plan, critique it against the brief, revise, then build.
</role>

<goal>
Build a front-end-only demo site I can show a prospective client in a sales call. It must look like their finished site, with believable content drawn from their real details. No backend yet.
Business type for this build: interior design studio.
</goal>

<client_info_handling>
My client's details are appended at the very end of this message under the BUSINESS DATA heading (Google Maps JSON) and the IMAGES AVAILABLE list. They may be messy or partial: raw Instagram bio, Google Maps listing, old website text, WhatsApp messages, or notes.
1. First, extract and list in a compact block: studio name, city/areas served, founder name(s), services, project types, style/aesthetic cues, notable projects, phone/WhatsApp/email, social links, tone of voice, anything distinctive about how they work.
2. Use these details everywhere: copy, project names, locations, services, contact info, and the design direction itself (the palette, type and layout should reflect their actual style and city, not a generic interior look).
3. For anything missing, invent believable placeholders consistent with the rest, and list each assumption in one line. Never invent facts that could embarrass the client in a demo (awards, named clients, certifications, years in business); keep those generic or leave them out.
4. Do not ask me questions. Proceed.
</client_info_handling>

<principles>
1. The work is the product. Project imagery dominates every page; copy is minimal and plain.
2. Take the design vocabulary from interiors: materials, textures, plans, swatches, joinery, light. No generic SaaS patterns.
3. One memorable element (e.g. a hero built from the studio's work, a plan-to-photo reveal, a material palette strip). Everything else stays quiet.
4. Avoid the generic defaults listed in the frontend-design skill.
</principles>

<pages>
- Home: hero, featured projects, short studio intro, services, testimonials, enquiry CTA
- Projects: filterable gallery (residential / commercial / by room type)
- Project detail: full-bleed images, brief, scope, area, location, materials, before/after slider
- Services and process: what they do and how a project runs (a real sequence, so numbering is justified here)
- About: founder(s), approach
- Contact: enquiry form (name, phone, project type, location, budget range, timeline, message) and a WhatsApp click-to-chat button
</pages>

<sales_demo_mode>
This site is a pre-built pitch for a specific studio. Optimise for "this is already mine".
1. Real assets: real photos are listed under IMAGES AVAILABLE; use those exact paths. If none are listed, use the placeholder approach below, but design for real photography. If photos are provided, derive the palette from them.
2. Private demo: noindex meta, Open Graph meta tags with a generated og.svg card (1200x630, studio name + hero), SVG favicon from their initials.
3. Budget estimator at /estimate: inputs (property type, area in sq ft or BHK, finish level) → price range computed from a rate table in js/content.js → ask for name and phone to reveal the range. State clearly it's an approximate estimate. Front-end only for now.
4. Every project page has "Want something like this?" opening the enquiry form prefilled with that project. WhatsApp links carry a prefilled message with the page/project name.
5. /admin-preview (not in nav): a static, branded mock dashboard with sample enquiries in a pipeline (new → contacted → site visit → quote sent → won) and an "add project" screen. Label it "Preview".
6. /proposal (not in nav): one-page private proposal with what's included, timeline and 3 pricing tiers read from js/content.js.
7. Copy: use their real area names, services and voice. Be specific, no filler like "crafting spaces that inspire".
8. Quality gate before finishing: check at 375px and 1440px, Lighthouse mobile ≥ 90, no layout shift, alt text on all images, and search the code for leftover placeholder strings ("Studio Name", "Lorem", "TODO"). Fix what fails. Pass the three-second test: what is this, whose is it, what do I do next.
</sales_demo_mode>

<technical>
- This is a STATIC site: plain HTML, CSS and vanilla JavaScript. No framework, no build step, no npm packages, no TypeScript. It is uploaded as-is to a static host, so index.html MUST exist at the site root.
- Pages are separate .html files: index.html, projects.html, project.html (reads the project id from the query string), services.html, about.html, contact.html, estimate.html, admin-preview.html, proposal.html. Link to them without the extension (for example /projects, /estimate); the host serves clean URLs.
- All content lives in one file, js/content.js, which sets window.SITE (studio name, tagline, colours, fonts, contact details, projects, services, testimonials, estimator rate table, proposal tiers). Pages render from it with small vanilla JS in js/app.js, and colours and fonts are applied as CSS variables from it. Rebranding for a new client means editing only that file and swapping images. All styles go in css/style.css.
- Imagery: use the real photo paths given under IMAGES AVAILABLE. If none are given, build placeholders from CSS or inline SVG with correct aspect ratios and tonal colour fields. Never use external image URLs. Web fonts via Google Fonts are fine, with a good system fallback.
- Form is front-end validated only; on submit, show a confirmation state.
- Mobile-first, keyboard-focusable, respects reduced motion, no heavy libraries.
- Output budget: the whole reply must fit in about 24,000 tokens. Use 4 sample projects, put shared markup logic in js/app.js rather than repeating it per page, and keep each page lean.
</technical>

<process>
1. Write the extracted client block, the design plan (palette as 4-6 named hex values, type roles, layout concept with ASCII wireframes, principles), your critique and what you changed, and the assumptions list into a file called NOTES.md. NOTES.md is for me and is not deployed.
2. Build the site files.
3. Your reply must contain ONLY files in the required file format. Write no text before, between or after the files; anything that is not inside a file breaks the build. Put the how-to-run and what-to-swap notes at the end of NOTES.md.
</process>

Make sure that the colour scheme used is that of the bussiness and if that is not found , use something unique and appropriate.

<design>
---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Approach this as the design lead at a design studio known for giving every client a distinct visual identity that is not mistaken for anyone else's. This client has already rejected proposals that felt cliché or templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risk if justified.

## Ground your designs in the subject matter

If the brief does not identify what the product or subject matter is, identify it yourself before designing, and confirm with the client. You can come up with one concrete subject, the design's audience, and the design's primary job, as a proposal. If there's any information in your memory about the client's preferences or context about what they're building, use that as a hint. The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from — a design for a toy for girls aged 8–11 will be very aesthetically different from a dashboard for financial analysts. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is the first thing viewers will see. Open with the most characteristic thing in the subject's world, in the form that is most appropriate: a headline, an image, an animation, a live demo, an interactive moment, or other treatments. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the default treatment, so only use it if that's truly the best option.

Typography carries the personality of the page. You don't need a different typeface for display or headline text and body content: use one family or two, and if two, make them clearly distinct.

Choose your typefaces deliberately, not the default families you would reach for on any other project, and set a clear type scale following the default guidance of The Elements of Typographic Style with intentional weights, widths, and spacing. When type is used as a headline or visual element, use the type treatment itself as an active part of the design, not a neutral delivery vehicle for the content.

Default to line lengths of less than 80 characters. Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif.

Avoid these default typographic treatments; they are the commonest tells of a generated page:
- Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color.
- Using all caps for labels.
- Adding unnecessary typographic labels above content.

Visual structure is information. Structural devices like outlines, borders, numbering, eyebrows, dividers, labels, etc., encode useful information about the content rather than decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence — like a stepped process or a timeline. Before adding numbered markers, check the content really is a sequence.

Use non-user-triggered motion sparingly and deliberately, only to draw attention. A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated. Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy and placeholder content. Copy can make a design feel as templated as the design itself. See the below section on writing for more guidance.

## Process: plan, review against the brief, build, critique

For calibration, AI-generated design right now clusters around some traits:
1. a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell);
2. a near-black background with a single bright acid-green or vermilion accent;
3. a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns;
4. the SaaS-card kit: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (rgba(0,0,0,.1)) under each, and gradient washes as decoration;
5. template chrome that appears whatever the subject: a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots ('A · B · C'); labels built as 'WORD — fragment' with a spaced em dash; tinted near-black (#0B0B0B, #111) standing in for black; a monospace face for small data labels; a '→' appended to link and button text.

All traits are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults. As with a hired human designer, there's often a careful balance between doing what you're good at and taking each project as a chance to experiment and learn.

Work in two passes. First, brainstorm a short design plan based on the client's design brief: create a compact token system with color, type, layout, and principles.
- Color: describe the core base palette as 4–6 named hex values.
- Type: the typefaces and their roles.
- Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Include alignment guidance; should the content be left aligned, center aligned, justified?
- Principles: the high-level guidance for what makes this page unique.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) rather than a choice made for this specific brief — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan.

When writing the code, be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out (especially with a type-based selector like .section and an element-based selector like .cta). This can happen often with padding/margin between sections.

## Restraint and self-critique

Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible, harmonious color palettes. Critique your own work as you build, taking screenshots to review if your environment supports it — a picture is worth 1000 tokens. Consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory. Human creatives have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes.

## More on writing in design

Words appear in a design for one reason: to make it easier to understand and use. They are design content, not decoration. Bring the same intentionality and minimalism to copywriting that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's perspective. Name things by what users will understand in simple language, not by how the system is built. A user manages notifications, not webhook config. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.

Use active voice as default. A CTA says exactly what happens when it is used: "Save changes," not "Submit." An action keeps the same name through the whole flow, so the button that says "Publish" produces a toast that says "Published." The vocabulary of an interface is the signposting for someone navigating the product. Cohesion and consistency are how people learn their way around.

Treat failure and emptiness as moments for direction, not mood. Explain what went wrong and how to fix it, in the interface's voice rather than a person's. Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act.

Keep the tone conversational: plain verbs, sentence case, no filler, with tone matched to the brand and the audience. Let each written element do exactly one job.
</design>
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
