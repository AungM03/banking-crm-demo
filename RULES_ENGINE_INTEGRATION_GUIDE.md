# CRM Rules Engine Integration Guide

This prototype now has two explainable rules engines:

- `fraudEngine.js`: evaluates active Fraud Notes and returns one Fraud Matrix Score.
- `recommendationEngine.js`: evaluates lending, wealth, and Discover Needs rules.

## Files Added

- `fraudEngine.js`
- `recommendationEngine.js`
- `lendingRules.js`
- `wealthRules.js`
- `discoverRules.js`

## Server Integration

In `server.mjs`, the rules files are loaded near the top:

```js
import "./lendingRules.js";
import "./wealthRules.js";
import "./discoverRules.js";
import "./fraudEngine.js";
import "./recommendationEngine.js";
```

The engine functions are pulled from `globalThis` after the imports:

```js
const { evaluateFraudRules } = globalThis.crmFraudEngine;
const { evaluateRecommendations } = globalThis.crmRecommendationEngine;
```

The authenticated API routes are added inside `handleApi`, after `/api/auth/me`:

```js
GET /api/fraud-analysis/:accountNumber
GET /api/recommendations/:accountNumber
```

Current file locations:

- `server.mjs:458` starts `/api/fraud-analysis/:accountNumber`
- `server.mjs:493` starts `/api/recommendations/:accountNumber`
- `server.mjs:2049` starts fraud-analysis role sanitizing
- `server.mjs:2070` starts recommendation context building
- `server.mjs:2078` starts recommendation role filtering

## Frontend API Integration

`api.js` now exposes:

```js
window.crmApi.getFraudAnalysis(accountNumber)
window.crmApi.getRecommendations(accountNumber)
```

Current file locations:

- `api.js:35` exposes both methods on `window.crmApi`
- `api.js:343` starts `getFraudAnalysis`
- `api.js:357` starts `getRecommendations`

## Access Behavior

Fraud analysis:

- Admin and Fraud see detailed matches, phrases, and actions.
- Banker, Wealth, and Loans can see score summary only if they have fraud summary access.
- HR and Marketing are restricted.

Recommendations:

- Admin sees lending, wealth, and Discover Needs.
- Banker sees lending and Discover Needs.
- Wealth sees wealth and Discover Needs.
- Loans sees lending and Discover Needs.
- Fraud, HR, and Marketing are restricted from individual customer product recommendations.

## Example Calls

```js
const fraud = await window.crmApi.getFraudAnalysis("10024588");
const recommendations = await window.crmApi.getRecommendations("10024588");
```

Direct API:

```http
GET /api/fraud-analysis/10024588
GET /api/recommendations/10024588
Authorization: Bearer <session-token>
```

Restart the local CRM server after changing these files so the new routes load.
