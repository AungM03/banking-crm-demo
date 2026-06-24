// fraudLlmClassifier.mjs
// Optional LLM enhancement layer for fraud note analysis.
//
// The keyword/phrase engine in fraudEngine.js is always the baseline and runs
// instantly with no dependencies. This module ADDS a semantic layer on top:
// it asks an LLM to read the note and decide which scam category (if any) it
// describes, reasoning about MEANING rather than exact keywords. That lets it
// catch things the phrase list misses -- "BTC", "crypto wallet", "she moved
// her savings after a guy online told her to", misspellings, paraphrases, etc.
//
// DESIGN: this layer is strictly optional and fails safe. If there is no API
// key, no network, a timeout, or any error, it returns null and the caller
// keeps the keyword-only result. The demo never breaks.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap; good enough for classification
const TIMEOUT_MS = 8000;

function getApiKey(env) {
  const e = env || (globalThis.process && globalThis.process.env) || {};
  return e.ANTHROPIC_API_KEY || e.CLAUDE_API_KEY || "";
}

// Is the enhancement available at all? Cheap synchronous check the server can
// use to decide whether to even attempt the call.
export function llmClassifierAvailable(env) {
  return Boolean(getApiKey(env));
}

// Build the category menu the model must choose from, derived from the SAME
// taxonomy the keyword engine uses, so the two layers stay aligned and the
// merge logic downstream is apples-to-apples.
function buildCategoryMenu(taxonomy) {
  return taxonomy
    .map(function fmt(rule, i) {
      return `${i + 1}. id="${rule.name}" | category="${rule.category}" | scoreLift=${rule.scoreLift} | riskTier="${rule.riskTier}"\n   when: ${rule.description}`;
    })
    .join("\n");
}

function buildPrompt(noteText, taxonomy) {
  const menu = buildCategoryMenu(taxonomy);
  return [
    "You are a fraud-analysis assistant for a community bank. A frontline employee",
    "wrote the note below about a customer interaction. Decide whether the note",
    "describes any of the known scam patterns. Reason about MEANING, not just exact",
    "words: e.g. \"BTC\", \"crypto wallet\", \"moved money to Coinbase\", or \"a man she met",
    "online told her to invest\" all relate to crypto/romance-investment scams even",
    "if the literal keywords differ. Account for synonyms, abbreviations, and typos.",
    "",
    "Known scam patterns (choose by id, or \"none\"):",
    menu,
    "",
    "Fraud note:",
    `\"\"\"${String(noteText || "").slice(0, 4000)}\"\"\"`,
    "",
    "Respond with ONLY a JSON object, no markdown, no preamble:",
    "{",
    '  "matchedId": "<rule id from the list, or null if none apply>",',
    '  "confidence": "<Low|Medium|High|Very High>",',
    '  "matchedConcept": "<the specific phrase or idea in the note that triggered this, in <=12 words>",',
    '  "rationale": "<one sentence, <=25 words, why this note fits that pattern>"',
    "}",
    "If nothing applies, return matchedId null and confidence Low."
  ].join("\n");
}

function extractJson(text) {
  if (!text) return null;
  // strip any code fences just in case, then grab the first {...} block
  const cleaned = String(text).replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

// Main entry point. Returns a normalized match object aligned with the keyword
// engine's match shape, or null on any failure / no-match.
//
//   { name, category, scoreLift, riskTier, confidence, matchedPhrase,
//     rationale, source: "llm" }
//
// taxonomy: array of the FRAUD_TEXT_RULES (name, category, description,
//           scoreLift, riskTier) exposed by fraudEngine.
export async function classifyFraudNote(noteText, taxonomy, env) {
  const apiKey = getApiKey(env);
  if (!apiKey) return null;
  if (!noteText || !String(noteText).trim()) return null;
  if (!Array.isArray(taxonomy) || taxonomy.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(function abort() {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildPrompt(noteText, taxonomy) }]
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = await response.json();
    const textBlock = Array.isArray(data.content)
      ? data.content.filter(function isText(b) { return b.type === "text"; })
          .map(function pick(b) { return b.text; })
          .join("\n")
      : "";

    const parsed = extractJson(textBlock);
    if (!parsed || !parsed.matchedId || parsed.matchedId === "null") return null;

    const rule = taxonomy.find(function byId(r) { return r.name === parsed.matchedId; });
    if (!rule) return null; // model hallucinated an id we don't recognize -> ignore

    return {
      name: rule.name,
      category: rule.category,
      description: rule.description,
      scoreLift: rule.scoreLift,
      riskTier: rule.riskTier,
      confidence: parsed.confidence || rule.confidence || "Medium",
      matchedPhrase: (parsed.matchedConcept || "").slice(0, 80) || null,
      rationale: (parsed.rationale || rule.rationale || "").slice(0, 200),
      action: rule.action,
      source: "llm"
    };
  } catch (err) {
    // network error, timeout/abort, malformed response -> fail safe
    return null;
  } finally {
    clearTimeout(timer);
  }
}
