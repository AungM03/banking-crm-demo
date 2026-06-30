# Deploying to the web (Render) with a password

This puts the full server (SQLite-backed API + optional AI layer) on a public URL
your teammates can reach in a browser -- no install on their end -- and locks it
behind a shared password, which matters since this is bank-themed.

## What you'll get

- A URL like `https://crm-prototype-xxxx.onrender.com`
- A browser password prompt before anything loads (username `demo` + your password)
- Free-tier demo storage. Added leads/notes may reset when Render restarts or
  redeploys the service.

## One-time setup

Render builds from the included `Dockerfile`, so there's nothing to compile. The
included Blueprint uses Render's free tier, which does not support persistent
disks.

### Option A -- deploy with the Blueprint (easiest)

1. Create a free account at https://render.com.
2. Put this project in a Git repo Render can read (GitHub/GitLab), OR use
   Render's "Deploy from a public Git repo" flow. (Render needs the files from
   a repo; it can't take a zip directly.)
3. In Render: **New > Blueprint**, point it at the repo. It reads `render.yaml`
   and creates the service automatically.
4. When prompted, set the **ACCESS_PASSWORD** value (this is your gate password).
   Optionally set **ANTHROPIC_API_KEY** to turn on AI fraud analysis.
5. Click apply. First build takes a few minutes; then open the URL.

### Option B -- deploy without a Blueprint

1. **New > Web Service**, connect the repo.
2. Render auto-detects the Dockerfile. Choose the **Free** plan.
3. Under **Environment**, add:
   - `HOST` = `0.0.0.0`
   - `DB_PATH` = `/tmp/crm.sqlite`
   - `ACCESS_PASSWORD` = (your chosen password)
   - `ACCESS_USER` = `demo`  (optional; defaults to `demo`)
   - `ANTHROPIC_API_KEY` = (optional, for the AI layer)
4. Create the service and open the URL.

## Sharing it with teammates

Send them the URL plus the username (`demo`) and the password. The browser
remembers it for the session. That's the whole handoff -- nothing to install.

## Notes / gotchas

- **Free tier sleeps and storage is ephemeral.** After idle time, the service can
  spin down; the next visit may take a bit to wake. Added leads/notes may reset
  after restarts or redeploys.
- **If you need persistence**, switch the service to a paid Starter plan, set
  `DB_PATH=/app/data/crm.sqlite`, and add a 1 GB disk mounted at `/app/data`.
- **The password gate is basic auth**, meant to keep a prototype off the open
  web -- not bank-grade security. Don't put real customer data behind it.
- **If you change the password**, update `ACCESS_PASSWORD` in the Render
  dashboard and redeploy.
- **The AI layer costs per note analyzed**, but it's a small/cheap model and only
  runs server-side when a key is set. Pennies for demo traffic.

## Other platforms

The same `Dockerfile` + env vars work on Fly.io, Railway, or any host that runs
a container. Render is just the least-setup option. The password gate
(`ACCESS_PASSWORD`) works the same way everywhere; persistence requires a host
volume or disk mounted at the path used by `DB_PATH`.
