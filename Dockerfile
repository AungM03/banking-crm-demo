# Community Bank CRM prototype
# Node 22 is required: the server uses the built-in node:sqlite module.
FROM node:22-slim

# App lives here inside the container.
WORKDIR /app

# Copy everything in (there are no npm dependencies to install, so no
# `npm install` step is needed -- the app uses only Node built-ins).
COPY . .

# The server reads PORT (default 4173) and HOST (default 0.0.0.0).
ENV PORT=4173
ENV HOST=0.0.0.0
EXPOSE 4173

# Optional: AI-assisted fraud analysis turns on automatically if you pass an
# Anthropic API key at run time (-e ANTHROPIC_API_KEY=...). Without it, the
# app runs the keyword + concept engine only, exactly like the offline demo.

# On first boot the server creates and seeds crm.sqlite if it is missing.
CMD ["node", "server.mjs"]
