# Site pipeline panel

Search a business on Google Maps, generate a demo front end with an LLM, deploy it to Vercel, then (after client approval) generate and deploy the back end.

## Deploy
1. Upload these files to a GitHub repo.
2. Vercel > Add New Project > import the repo (no build settings needed).
3. Add the environment variables listed in `.env.example`.
4. Open the project URL, enter your admin password.

Edit your two prompts in `lib/prompts.js`.
