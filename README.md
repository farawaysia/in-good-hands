# In Good Hands

A landing page for **In Good Hands** — an AI guide and human concierge for families in Singapore in the days after a death.

This is a single self-contained static page (`index.html`). All CSS and JavaScript are inline, and the one custom font (Calypso) is embedded directly in the file. The only external dependency is Google Fonts (Tenor Sans, Prata, Pacifico), loaded over HTTPS. There is no build step and no server-side code — it can be hosted anywhere that serves static files.

## Deploy it yourself (10 minutes, no coding)

### Step 1 — Put it on GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository (call it `in-good-hands` or whatever you like). Leave it empty — don't add a README there, since you already have one here.
2. On the new repo's page, click **"uploading an existing file."**
3. Drag both `index.html` and this `README.md` into the browser window, then click **Commit changes**.

That's it — no git command line needed. (If you *do* prefer the command line: `git init`, `git add .`, `git commit -m "In Good Hands landing page"`, then follow GitHub's instructions to add the remote and push.)

### Step 2 — Deploy it on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (you can use your GitHub account to sign in with one click).
2. Click **"Import"** next to the `in-good-hands` repository.
3. Vercel will detect it as a static site automatically — no settings to change. Click **Deploy**.
4. In about 30 seconds you'll get a live URL like `in-good-hands.vercel.app`.

### Custom domain (optional)

In the Vercel project's **Settings → Domains**, you can attach your own domain (e.g. `ingoodhands.sg`) if you own one — Vercel will walk you through the DNS records to add.

## Updating the site later

Any time you want to change the page: edit `index.html`, upload the new version to the same GitHub repo (GitHub's web UI lets you edit files directly, or drag a replacement file in), and Vercel will automatically redeploy within a minute — no extra steps.

## What's inside

- Hero, problem, and "why now" sections
- A research-backed stats section (sourced from the CCCS 2023 Funeral Services Industry Market Study)
- A live, interactive concierge demo (simulated AI + human handoff conversation)
- Promises, partner/community outreach, and an early-access sign-up section

**Note:** the early-access sign-up form is currently a front-end preview only — it does not save submissions anywhere yet. If you want real responses collected, the simplest option is to swap in a free form service (e.g. [Tally](https://tally.so) or a Google Form) and point the form's submit handler at it; ask if you'd like help wiring that up.
