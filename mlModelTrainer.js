(function attachMlModelTrainer(root, factory) {
  const api = factory(root.crmTrainingDataGenerator);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmMlModelTrainer = api;
    return;
  }

  root.crmMlModelTrainer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMlModelTrainer(trainingDataGenerator) {
  const FEATURE_NAMES = trainingDataGenerator ? trainingDataGenerator.FEATURE_NAMES : [];

  function trainLogisticRegression(trainingData, options) {
    const config = {
      modelName: "recommendation_model_v1",
      productKey: "unknown",
      learningRate: 0.55,
      epochs: 900,
      l2: 0.0015,
      testRatio: 0.2,
      threshold: 0.5,
      trainedAt: "2026-06-11T00:00:00.000Z",
      ...(options || {})
    };
    const examples = (trainingData || []).filter(function hasLabel(example) {
      return example && example.features && (example.label === 0 || example.label === 1);
    });

    if (examples.length < 20) {
      throw new Error("At least 20 training examples are required.");
    }

    const featureStats = getFeatureStats(examples);
    const shuffled = deterministicShuffle(examples);
    const testCount = Math.max(1, Math.round(shuffled.length * config.testRatio));
    const testSet = shuffled.slice(0, testCount);
    const trainSet = shuffled.slice(testCount);
    let baseline = logit(meanLabel(trainSet));
    const coefficients = FEATURE_NAMES.reduce(function initialCoefficients(result, featureName) {
      result[featureName] = 0;
      return result;
    }, {});

    for (let epoch = 0; epoch < config.epochs; epoch += 1) {
      const gradients = FEATURE_NAMES.reduce(function initialGradients(result, featureName) {
        result[featureName] = 0;
        return result;
      }, {});
      let baselineGradient = 0;

      trainSet.forEach(function accumulateGradient(example) {
        const scaled = scaleFeatures(example.features, featureStats);
        const prediction = sigmoid(getLinearScore(baseline, coefficients, scaled));
        const error = prediction - example.label;
        baselineGradient += error;

        FEATURE_NAMES.forEach(function featureGradient(featureName) {
          gradients[featureName] += error * scaled[featureName];
        });
      });

      baseline -= config.learningRate * (baselineGradient / trainSet.length);

      FEATURE_NAMES.forEach(function updateCoefficient(featureName) {
        const regularizedGradient = (gradients[featureName] / trainSet.length) + (config.l2 * coefficients[featureName]);
        coefficients[featureName] -= config.learningRate * regularizedGradient;
      });
    }

    const metrics = evaluateModel({ baseline, coefficients, featureStats, threshold: config.threshold }, testSet);

    return {
      modelName: config.modelName,
      productKey: config.productKey,
      type: "logistic_regression",
      version: "v1",
      active: true,
      trainedAt: config.trainedAt,
      featureNames: FEATURE_NAMES,
      baseline: round4(baseline),
      coefficients: roundCoefficientMap(coefficients),
      featureStats,
      metrics,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
      training: {
        examples: examples.length,
        trainExamples: trainSet.length,
        testExamples: testSet.length,
        epochs: config.epochs,
        learningRate: config.learningRate,
        l2: config.l2,
        threshold: config.threshold
      },
      featureImportance: getFeatureImportance(coefficients)
    };
  }

  function trainModels(trainingDataByProduct, optionsByProduct) {
    return Object.keys(trainingDataByProduct || {}).reduce(function reduceProducts(result, productKey) {
      const options = (optionsByProduct && optionsByProduct[productKey]) || {};
      result[productKey] = trainLogisticRegression(trainingDataByProduct[productKey], {
        productKey,
        modelName: `${productKey}_v1`,
        ...options
      });
      return result;
    }, {});
  }

  function evaluateModel(model, examples) {
    const confusion = {
      truePositive: 0,
      trueNegative: 0,
      falsePositive: 0,
      falseNegative: 0
    };

    examples.forEach(function evaluateExample(example) {
      const probability = predictProbability(model, example.features);
      const predicted = probability >= (model.threshold || 0.5) ? 1 : 0;

      if (predicted === 1 && example.label === 1) confusion.truePositive += 1;
      if (predicted === 0 && example.label === 0) confusion.trueNegative += 1;
      if (predicted === 1 && example.label === 0) confusion.falsePositive += 1;
      if (predicted === 0 && example.label === 1) confusion.falseNegative += 1;
    });

    const total = examples.length || 1;
    const precision = divide(confusion.truePositive, confusion.truePositive + confusion.falsePositive);
    const recall = divide(confusion.truePositive, confusion.truePositive + confusion.falseNegative);
    const f1Score = divide(2 * precision * recall, precision + recall);

    return {
      accuracy: round4((confusion.truePositive + confusion.trueNegative) / total),
      precision: round4(precision),
      recall: round4(recall),
      f1Score: round4(f1Score),
      confusionMatrix: confusion
    };
  }

  function predictProbability(model, features) {
    const scaled = scaleFeatures(features, model.featureStats);
    return sigmoid(getLinearScore(model.baseline, model.coefficients, scaled));
  }

  function getFeatureStats(examples) {
    return FEATURE_NAMES.reduce(function reduceFeatures(result, featureName) {
      const values = examples.map(function mapValue(example) {
        return Number(example.features[featureName]) || 0;
      });
      const min = Math.min.apply(null, values);
      const max = Math.max.apply(null, values);

      result[featureName] = {
        min: round4(min),
        max: round4(max)
      };
      return result;
    }, {});
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

  function getLinearScore(baseline, coefficients, scaledFeatures) {
    return FEATURE_NAMES.reduce(function sumScore(total, featureName) {
      return total + ((Number(coefficients[featureName]) || 0) * (Number(scaledFeatures[featureName]) || 0));
    }, Number(baseline) || 0);
  }

  function getFeatureImportance(coefficients) {
    return FEATURE_NAMES.map(function mapImportance(featureName) {
      return {
        feature: featureName,
        weight: round4(coefficients[featureName])
      };
    }).sort(function sortImportance(a, b) {
      return Math.abs(b.weight) - Math.abs(a.weight);
    });
  }

  function deterministicShuffle(examples) {
    return examples.slice().sort(function sortExamples(a, b) {
      return seededRandom(`${a.accountNumber}:${a.productKey}`) - seededRandom(`${b.accountNumber}:${b.productKey}`);
    });
  }

  function meanLabel(examples) {
    return examples.reduce(function sumLabels(total, example) {
      return total + example.label;
    }, 0) / examples.length;
  }

  function logit(value) {
    const clamped = Math.max(0.01, Math.min(0.99, value));
    return Math.log(clamped / (1 - clamped));
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function divide(numerator, denominator) {
    return denominator ? numerator / denominator : 0;
  }

  function round4(value) {
    return Math.round((Number(value) || 0) * 10000) / 10000;
  }

  function roundCoefficientMap(coefficients) {
    return FEATURE_NAMES.reduce(function reduceCoefficients(result, featureName) {
      result[featureName] = round4(coefficients[featureName]);
      return result;
    }, {});
  }

  function seededRandom(seed) {
    let hash = 2166136261;
    const text = String(seed);

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4294967295;
  }

  return {
    trainLogisticRegression,
    trainModels,
    evaluateModel,
    predictProbability,
    scaleFeatures
  };
});
