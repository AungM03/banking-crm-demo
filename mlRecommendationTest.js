(function attachMlRecommendationTest(root, factory) {
  const api = factory(root.crmTrainingDataGenerator, root.crmMlModelTrainer, root.crmMlPredictor);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  root.crmMlRecommendationTest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMlRecommendationTest(trainingDataGenerator, modelTrainer, predictor) {
  const PRODUCT_KEYS = ["investment_review", "mortgage_refinance"];

  function runEvaluation(customers, context) {
    if (!trainingDataGenerator || !modelTrainer || !predictor) {
      throw new Error("ML test requires trainingDataGenerator, mlModelTrainer, and mlPredictor.");
    }

    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeContext = {
      today: "2026-06-11",
      meetings: [],
      syntheticCopies: 20,
      ...(context || {})
    };
    const currentTraining = trainingDataGenerator.generateTrainingDataForProducts(safeCustomers, PRODUCT_KEYS, safeContext);
    const broadTraining = trainingDataGenerator.generateTrainingDataForProducts([], PRODUCT_KEYS, {
      today: safeContext.today,
      meetings: []
    });
    const trainingData = {
      investment_review: currentTraining.investment_review.concat(broadTraining.investment_review),
      mortgage_refinance: currentTraining.mortgage_refinance.concat(broadTraining.mortgage_refinance)
    };
    const models = modelTrainer.trainModels(trainingData, {
      investment_review: { epochs: 900, learningRate: 0.5, l2: 0.0025, testRatio: 0.2 },
      mortgage_refinance: { epochs: 900, learningRate: 0.5, l2: 0.0025, testRatio: 0.2 }
    });

    return {
      generatedAt: safeContext.today,
      trainingExamples: summarizeTraining(trainingData),
      metrics: summarizeMetrics(models),
      featureImportance: summarizeFeatureImportance(models),
      samplePredictions: getSamplePredictions(safeCustomers, models, safeContext)
    };
  }

  function summarizeTraining(trainingData) {
    return PRODUCT_KEYS.reduce(function reduceProducts(result, productKey) {
      const rows = trainingData[productKey] || [];
      const positiveCount = rows.reduce(function sumLabels(total, row) {
        return total + (row.label ? 1 : 0);
      }, 0);

      result[productKey] = {
        examples: rows.length,
        positiveCount,
        negativeCount: rows.length - positiveCount,
        positiveRate: round4(rows.length ? positiveCount / rows.length : 0)
      };
      return result;
    }, {});
  }

  function summarizeMetrics(models) {
    return PRODUCT_KEYS.reduce(function reduceProducts(result, productKey) {
      const model = models[productKey];
      result[productKey] = model ? {
        accuracy: model.accuracy,
        precision: model.precision,
        recall: model.recall,
        f1Score: model.f1Score,
        confusionMatrix: model.metrics.confusionMatrix
      } : null;
      return result;
    }, {});
  }

  function summarizeFeatureImportance(models) {
    return PRODUCT_KEYS.reduce(function reduceProducts(result, productKey) {
      const model = models[productKey];
      result[productKey] = model ? model.featureImportance.slice(0, 8) : [];
      return result;
    }, {});
  }

  function getSamplePredictions(customers, models, context) {
    return customers.slice(0, 6).map(function mapCustomer(customer) {
      return {
        accountNumber: customer.accountNumber,
        name: customer.name,
        investmentReview: predictor.predictCustomer(models.investment_review, customer, context),
        mortgageRefinance: predictor.predictCustomer(models.mortgage_refinance, customer, context)
      };
    });
  }

  function round4(value) {
    return Math.round((Number(value) || 0) * 10000) / 10000;
  }

  return {
    runEvaluation
  };
});
