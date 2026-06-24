# ML Product Recommendation Integration

This prototype uses a small logistic-regression style model for two products:

- Managed Investment Review
- Mortgage Refinance Review

The recommendation score is blended like this:

```text
Final score = (Rules score * 30%) + (ML score * 70%)
```

The rules engine still explains the banker-friendly business logic. The ML layer adds probability scoring based on customer features.

## New Files

- `trainingDataGenerator.js`: builds model features and synthetic training labels from CRM customer records.
- `mlModelTrainer.js`: trains and evaluates logistic regression models.
- `mlPredictor.js`: scores a customer against a saved model and returns top factors.
- `mlRecommendationTest.js`: optional evaluation runner for metrics, confusion matrix, feature importance, and sample predictions.
- `models/investment_review_v1.json`: saved investment recommendation model.
- `models/mortgage_refinance_v1.json`: saved mortgage refinance recommendation model.
- `models/activeMlModels.js`: browser/server loader for the active models.

## Server Integration

Add these imports before `recommendationEngine.js` in `server.mjs`:

```js
import "./trainingDataGenerator.js";
import "./mlModelTrainer.js";
import "./mlPredictor.js";
import "./models/activeMlModels.js";
import "./recommendationEngine.js";
```

The current prototype already has those lines in place.

## Recommendation Engine Integration

`recommendationEngine.js` now loads:

```js
root.crmRecommendationEngine = factory(
  root.crmLendingRules,
  root.crmWealthRules,
  root.crmDiscoverRules,
  root.crmMlPredictor,
  root.crmMlActiveModels
);
```

For products with a trained model, each recommendation includes:

- `score`: final blended score
- `ruleScore`: original rules-only score
- `mlScore`: ML model score
- `scoringMethod`: `30% rules + 70% ML`
- `modelName`: active model used
- `mlExplanation`: readable explanation
- `topFactors`: strongest feature drivers

## Example Outputs

Thomas Nguyen, account `10090866`:

```json
{
  "product": "Managed Investment Review",
  "finalScore": 89,
  "ruleScore": 83,
  "mlScore": 91,
  "method": "30% rules + 70% ML",
  "topFactors": ["householdBalance", "hasInvestments", "investedBalance"]
}
```

Grace Bennett, account `10144520`:

```json
[
  {
    "product": "Managed Investment Review",
    "finalScore": 87,
    "ruleScore": 83,
    "mlScore": 88,
    "method": "30% rules + 70% ML"
  },
  {
    "product": "Mortgage Refinance Review",
    "finalScore": 86,
    "ruleScore": 60,
    "mlScore": 97,
    "method": "30% rules + 70% ML"
  }
]
```

## Model Quality

Current saved model metrics:

| Model | Accuracy | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Investment Review | 85.56% | 85.71% | 97.06% | 91.03% |
| Mortgage Refinance | 94.44% | 93.75% | 90.91% | 92.31% |

These are prototype metrics from seeded and synthetic demo data, not production bank performance.

## Optional Test Runner

Load these files in order, then run the evaluation:

```html
<script src="data.js"></script>
<script src="trainingDataGenerator.js"></script>
<script src="mlModelTrainer.js"></script>
<script src="mlPredictor.js"></script>
<script src="mlRecommendationTest.js"></script>
```

```js
const report = window.crmMlRecommendationTest.runEvaluation(window.crmCustomers, {
  meetings: window.crmMeetings,
  today: "2026-06-11"
});

console.log(report.metrics);
console.log(report.featureImportance);
console.log(report.samplePredictions);
```
