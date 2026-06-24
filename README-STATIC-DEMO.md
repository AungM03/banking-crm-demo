# CRM Static Demo

Open `home.html` in a browser.

Use the role switcher on the Home page and explore the role-based CRM pages.

This version is for feedback and integration ideas. It does not need Node.js.

Static demo limits:

- Data comes from `data.js`, not SQLite.
- Server-backed edits and shared saves are not active.
- The full API-backed version still requires the local CRM server.

## Fraud note matching: keywords + concepts

The static demo's fraud engine (`fraud-rules.js`) matches notes two ways:

1. **Precise phrases** -- multi-word scam patterns ("bitcoin atm", "move money
   to a safe account").
2. **Concepts** -- single-word aliases and stems ("bitcoin", "BTC", "crypto",
   "wire transfer", "gift card") that reinforce the same scam categories, so a
   brief note like "Bitcoin was mentioned" still raises the score.

Concept matching is whole-word (so "btc" won't match inside "btcouples") with a
light suffix allowance (invest / invests / investing). It runs fully offline.

For notes that describe a scam with *no* trigger words at all (a pure
paraphrase), use the optional server-side AI layer -- see README-SQL.md.
