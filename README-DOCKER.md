# Running the CRM prototype with Docker

This is the easiest way to run the full server (SQLite-backed) on a work
computer without installing Node or any dependencies yourself. You do **not**
need GitHub -- everything is in this folder.

## Prerequisites

- Docker Desktop installed and running.
  (Windows/Mac: install "Docker Desktop". Linux: install Docker Engine.)

That's it. There are no other dependencies.

## Quick start (one command)

From inside this folder, run:

```bash
docker compose up --build
```

Then open **http://localhost:4173** in your browser.

To stop it: press `Ctrl+C`, or run `docker compose down`.

## Without docker-compose (plain Docker)

```bash
# Build the image once
docker build -t crm-prototype .

# Run it
docker run --rm -p 4173:4173 crm-prototype
```

Open http://localhost:4173.

## Optional: turn on AI-assisted fraud analysis

The fraud engine always runs the keyword + concept matcher (catches "bitcoin",
"crypto", "wire transfer", etc.). To also enable the semantic AI layer that
reads notes for meaning, provide an Anthropic API key at run time:

```bash
# compose: edit docker-compose.yml and uncomment the ANTHROPIC_API_KEY line, then
docker compose up --build

# or plain docker:
docker run --rm -p 4173:4173 -e ANTHROPIC_API_KEY=sk-ant-xxxx crm-prototype
```

The key stays inside the container/server and is never sent to the browser. If
no key is set, the app simply runs keyword + concept only -- nothing breaks.

> Note: the AI layer sends fraud-note text to the Anthropic API. That's fine for
> this prototype's seeded demo data. Do not point it at real customer data
> without a proper data-handling review first.

## Data persistence

With `docker compose up`, the SQLite database is stored on a named volume
(`crm-data`) mounted at `/app/data`, so leads/notes you add survive restarts.
To wipe it and start fresh:

```bash
docker compose down -v
```

With plain `docker run`, the database lives inside the container and is lost
when the container is removed (`--rm`). To keep it, mount a folder:

```bash
docker run --rm -p 4173:4173 \
  -e DB_PATH=/app/data/crm.sqlite \
  -v "$PWD/crm-data:/app/data" \
  crm-prototype
```

## Changing the port

If 4173 is taken, map a different host port (left side):

```bash
docker run --rm -p 8080:4173 crm-prototype   # then open http://localhost:8080
```

## Reset the seeded database

The server seeds `crm.sqlite` automatically on first boot if it's missing.
To force a rebuild from `schema.sql` + `seed.sql`:

```bash
docker run --rm -p 4173:4173 crm-prototype node server.mjs --reset-db
```

## The static demo still works without Docker

If you only need the click-through demo (no server features like SQL persistence
or the AI layer), you can still just open `home.html` directly in a browser --
no Docker required. Docker is for running the full server build.
