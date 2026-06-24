(function attachMlPredictor(root, factory) {
  const api = factory(root.crmTrainingDataGenerator);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmMlPredictor = api;
    return;
  }

  root.crmMlPredictor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMlPredictor(trainingDataGenerator) {
  const FEATURE_NAMES = trainingDataGenerator ? trainingDataGenerator.FEATURE_NAMES : [];
  const PRODUCT_MODEL_MAP = {
    "Managed Investment Review": "investment_review",
    "Investment Review": "investment_review",
    "Mortgage Refinance Review": "mortgage_refinance",
    "Mortgage Refinance": "mortgage_refinance"
  };

  function predictCustomer(model, customer, context) {
    if (!model || !trainingDataGenerator) {
      return null;
    }

    const features = trainingDataGenerator.computeFeatures(customer, context || {});
    const scaledFeatures = scaleFeatures(features, model.featureStats || {});
    const contributions = FEATURE_NAMES.map(function mapContribution(featureName) {
      const coefficient = Number(model.coefficients && model.coefficients[featureName]) || 0;
      const contribution = coefficient * (Number(scaledFeatures[featureName]) || 0);
      return {
        feature: featureName,
        value: features[featureName],
        scaledValue: round4(scaledFeatures[featureName]),
        coefficient: round4(coefficient),
        contribution: round4(contribution),
        direction: contribution >= 0 ? "positive" : "negative"
      };
    });
    const logitScore = contributions.reduce(function sumContributions(total, item) {
      return total + item.contribution;
    }, Number(model.baseline) || 0);
    const probability = sigmoid(logitScore);
    const score = Math.round(probability * 100);
    const topFactors = contributions
      .filter(function hasContribution(item) {
        return Math.abs(item.contribution) > 0.0001;
      })
      .sort(function sortFactors(a, b) {
        return Math.abs(b.contribution) - Math.abs(a.contribution);
      })
      .slice(0, 4);

    return {
      modelName: model.modelName,
      productKey: model.productKey,
      probability: round4(probability),
      score,
      tier: getProbabilityTier(probability),
      confidence: round4(probability),
      features,
      topFactors,
      explanation: buildExplanation(probability, topFactors, features)
    };
  }

  function predictProduct(productName, customer, context, models) {
    const productKey = getProductKey(productName);
    const model = productKey && models ? models[productKey] : null;
    return model ? predictCustomer(model, customer, context) : null;
  }

  function getProductKey(productName) {
    return PRODUCT_MODEL_MAP[productName] || "";
  }

  function scaleFeatures(features, featureStats) {
    return FEATURE_NAMES.reduce(function reduceFeatures(result, featureName) {
      const stat = featureStats[featureName] || { min: 0, max: 1 };
      const value = Number(features[featureName]) || 0;
      const range = stat.max - stat.min;
      result[featureName] = range === 0 ? 0 : Math.max(0, Math.min(1, (value - stat.min) / range));
      return result;
    }, {});
  }

  function getProbabilityTier(probability) {
    if (probability >= 0.7) return "High";
    if (probability >= 0.4) return "Medium";
    return "Low";
  }

  function buildExplanation(probability, topFactors, features) {
    const tier = getProbabilityTier(probability).toLowerCase();
    const readableFactors = topFactors.slice(0, 3).map(function mapFactor(factor) {
      return `${toLabel(factor.feature)} ${formatFeatureValue(factor.feature, factor.value)}`;
    });
    const prefix = `${capitalize(tier)} probability`;

    if (!readableFactors.length) {
      return `${prefix}: the model did not find a dominant feature driver.`;
    }

    return `${prefix}: driven by ${readableFactors.join(", ")}.`;
  }

  function toLabel(featureName) {
    return featureName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, function upper(char) { return char.toUpperCase(); })
      .toLowerCase();
  }

  function formatFeatureValue(featureName, value) {
    if (featureName.toLowerCase().includes("balance")) {
      return formatCurrency(value);
    }

    if (["wealthGap", "savingsRate", "debtToIncome", "engagementScore"].includes(featureName)) {
      return `${Math.round((Number(value) || 0) * 100)}%`;
    }

    return String(value);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function round4(value) {
    return Math.round((Number(value) || 0) * 10000) / 10000;
  }

  function capitalize(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  return {
    PRODUCT_MODEL_MAP,
    predictCustomer,
    predictProduct,
    getProductKey,
    scaleFeatures
  };
});
