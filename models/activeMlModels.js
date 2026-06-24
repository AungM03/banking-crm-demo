(function attachActiveMlModels(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmMlActiveModels = api;
    return;
  }

  root.crmMlActiveModels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createActiveMlModels() {
  const models = {
    investment_review: {
      modelName: "investment_review_v1",
      productKey: "investment_review",
      type: "logistic_regression",
      version: "v1",
      active: true,
      trainedAt: "2026-06-11T00:00:00.000Z",
      baseline: -3.2255,
      coefficients: {
        age: -0.2855,
        householdBalance: 5.0373,
        investedBalance: 1.3433,
        wealthGap: 3.0292,
        creditScore: 0.8543,
        fraudScore: -1.5526,
        daysLastContact: -1.435,
        meetingsLastYear: 0.5591,
        hasInvestments: 2.057,
        hasMortgage: -0.2553,
        relationshipYears: 0.8999,
        accountCount: -0.5389,
        engagementScore: -0.2447,
        savingsRate: 0.4866,
        debtToIncome: 0.7042
      },
      featureStats: {
        age: { min: 31, max: 74 },
        householdBalance: { min: 15004, max: 1917201 },
        investedBalance: { min: 0, max: 1750093 },
        wealthGap: { min: 0, max: 1 },
        creditScore: { min: 681, max: 782 },
        fraudScore: { min: 0, max: 100 },
        daysLastContact: { min: 10, max: 120 },
        meetingsLastYear: { min: 0, max: 1 },
        hasInvestments: { min: 0, max: 1 },
        hasMortgage: { min: 0, max: 1 },
        relationshipYears: { min: 0.5, max: 33 },
        accountCount: { min: 2, max: 3 },
        engagementScore: { min: 0, max: 0.2933 },
        savingsRate: { min: 0.052, max: 1 },
        debtToIncome: { min: 0, max: 1 }
      },
      metrics: { accuracy: 0.8556, precision: 0.8571, recall: 0.9706, f1Score: 0.9103 }
    },
    mortgage_refinance: {
      modelName: "mortgage_refinance_v1",
      productKey: "mortgage_refinance",
      type: "logistic_regression",
      version: "v1",
      active: true,
      trainedAt: "2026-06-11T00:00:00.000Z",
      baseline: -2.0597,
      coefficients: {
        age: 0.4218,
        householdBalance: 3.1031,
        investedBalance: 1.7929,
        wealthGap: -0.9393,
        creditScore: 1.6001,
        fraudScore: -2.1539,
        daysLastContact: -0.1163,
        meetingsLastYear: -0.1622,
        hasInvestments: -0.6621,
        hasMortgage: 4.7579,
        relationshipYears: 1.1739,
        accountCount: -0.2159,
        engagementScore: -0.584,
        savingsRate: -0.6741,
        debtToIncome: 0.0494
      },
      featureStats: {
        age: { min: 31, max: 74 },
        householdBalance: { min: 15004, max: 1917201 },
        investedBalance: { min: 0, max: 1750093 },
        wealthGap: { min: 0, max: 1 },
        creditScore: { min: 681, max: 782 },
        fraudScore: { min: 0, max: 100 },
        daysLastContact: { min: 10, max: 120 },
        meetingsLastYear: { min: 0, max: 1 },
        hasInvestments: { min: 0, max: 1 },
        hasMortgage: { min: 0, max: 1 },
        relationshipYears: { min: 0.5, max: 33 },
        accountCount: { min: 2, max: 3 },
        engagementScore: { min: 0, max: 0.2933 },
        savingsRate: { min: 0.052, max: 1 },
        debtToIncome: { min: 0, max: 1 }
      },
      metrics: { accuracy: 0.9444, precision: 0.9375, recall: 0.9091, f1Score: 0.9231 }
    }
  };

  return {
    modelVersion: "v1",
    blend: { rules: 0.3, ml: 0.7 },
    models,
    investment_review: models.investment_review,
    mortgage_refinance: models.mortgage_refinance
  };
});
