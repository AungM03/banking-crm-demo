(function attachRecommendationEngine(root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    const lending = require("./lendingRules.js");
    const wealth = require("./wealthRules.js");
    const discover = require("./discoverRules.js");
    const mlPredictor = require("./mlPredictor.js");
    const mlModels = require("./models/activeMlModels.js");
    const api = factory(lending, wealth, discover, mlPredictor, mlModels);
    module.exports = api;
    root.crmRecommendationEngine = api;
    return;
  }

  root.crmRecommendationEngine = factory(root.crmLendingRules, root.crmWealthRules, root.crmDiscoverRules, root.crmMlPredictor, root.crmMlActiveModels);
})(typeof globalThis !== "undefined" ? globalThis : this, function createRecommendationEngine(lendingModule, wealthModule, discoverModule, mlPredictorModule, mlModelsModule) {
  const lendingRules = (lendingModule && lendingModule.lendingRules) || [];
  const wealthRules = (wealthModule && wealthModule.wealthRules) || [];
  const discoverRules = (discoverModule && discoverModule.discoverRules) || [];
  const ALL_RULES = lendingRules.concat(wealthRules, discoverRules);
  const mlPredictor = mlPredictorModule || null;
  const SCORE_BLEND = { rules: 0.3, ml: 0.7 };

  const helpers = {
    normalize,
    getNumber,
    clampScore,
    scoreToPriority,
    formatCurrency,
    parsePercent,
    findLoan,
    isCurrentLoan,
    hasAccountType,
    getAccountBalanceByType,
    getCreditCardBalance,
    accountMaturesWithinMonths,
    getRelationshipYears,
    monthsSince,
    getCreditScore,
    getFraudScore
  };

  function evaluateRecommendations(customer, context) {
    const safeCustomer = customer || {};
    const safeContext = {
      today: getToday(),
      lendingProfile: null,
      wealthProfile: null,
      ...(context || {})
    };
    const input = {
      customer: safeCustomer,
      context: safeContext,
      helpers
    };
    const evaluated = ALL_RULES.map(function evaluateRule(rule) {
      return evaluateRecommendationRule(rule, input);
    }).filter(Boolean).sort(sortRecommendations);
    const nextBestAction = getNextBestAction(evaluated);

    return {
      customer: {
        accountNumber: safeCustomer.accountNumber,
        name: safeCustomer.name
      },
      generatedAt: safeContext.today,
      recommendationCount: evaluated.length,
      nextBestAction,
      categories: {
        lending: evaluated.filter(function byCategory(item) { return item.category === "lending"; }),
        wealth: evaluated.filter(function byCategory(item) { return item.category === "wealth"; }),
        discover: evaluated.filter(function byCategory(item) { return item.category === "discover"; })
      },
      recommendations: evaluated,
      ruleCount: ALL_RULES.length,
      ruleSets: {
        lending: lendingRules.length,
        wealth: wealthRules.length,
        discover: discoverRules.length
      }
    };
  }

  function evaluateRecommendationRule(rule, input) {
    if (!safeCall(rule.conditions, input, false)) {
      return null;
    }

    const exclusion = (rule.exclusions || []).find(function findExclusion(candidate) {
      return safeCall(candidate.when, input, false);
    });

    if (exclusion) {
      return null;
    }

    const rawScore = typeof rule.score === "function" ? safeCall(rule.score, input, 0) : rule.score;
    const ruleScore = clampScore(rawScore || 0);
    const mlBlend = getMlBlend(rule, input, ruleScore);
    const score = mlBlend ? mlBlend.score : ruleScore;
    const priority = typeof rule.priority === "function"
      ? rule.priority(input, score)
      : (rule.priority || scoreToPriority(score));
    const reason = typeof rule.reason === "function"
      ? rule.reason(input, score)
      : rule.reason;
    const nextAction = typeof rule.nextAction === "function"
      ? rule.nextAction(input, score)
      : rule.nextAction;

    return {
      ruleName: rule.name,
      category: rule.category,
      product: rule.product,
      score,
      ruleScore,
      mlScore: mlBlend ? mlBlend.mlScore : null,
      scoreSource: mlBlend ? "rules_ml_blend" : "rules_only",
      scoringMethod: mlBlend ? "30% rules + 70% ML" : "Rules engine",
      modelName: mlBlend && mlBlend.prediction ? mlBlend.prediction.modelName : null,
      modelConfidence: mlBlend && mlBlend.prediction ? mlBlend.prediction.confidence : null,
      mlExplanation: mlBlend && mlBlend.prediction ? mlBlend.prediction.explanation : "",
      topFactors: mlBlend && mlBlend.prediction ? mlBlend.prediction.topFactors : [],
      priority,
      reason,
      nextAction,
      requiredFields: rule.requiredFields || [],
      abTestKey: rule.abTestKey || rule.name,
      status: score >= 75 ? "Ready for outreach" : "Needs banker review"
    };
  }

  function getMlBlend(rule, input, ruleScore) {
    const modelMap = getActiveMlModelMap();

    if (!mlPredictor || typeof mlPredictor.predictProduct !== "function" || !modelMap) {
      return null;
    }

    const prediction = safeCall(function predictRecommendation() {
      return mlPredictor.predictProduct(rule.product, input.customer, input.context, modelMap);
    }, input, null);

    if (!prediction) {
      return null;
    }

    const mlScore = clampScore(prediction.score);
    const score = clampScore((ruleScore * SCORE_BLEND.rules) + (mlScore * SCORE_BLEND.ml));

    return {
      score,
      mlScore,
      prediction
    };
  }

  function getActiveMlModelMap() {
    const lateLoadedModels = typeof globalThis !== "undefined" ? globalThis.crmMlActiveModels : null;
    const source = mlModelsModule || lateLoadedModels || {};
    return source.models || source;
  }

  function getNextBestAction(recommendations) {
    const discoverAction = recommendations.find(function isHighDiscover(item) {
      return item.category === "discover" && item.priority === "High";
    });
    const top = discoverAction || recommendations[0] || null;

    if (!top) {
      return null;
    }

    return {
      title: top.product,
      priority: top.priority,
      reason: top.reason,
      nextAction: top.nextAction,
      score: top.score,
      sourceRule: top.ruleName
    };
  }

  function sortRecommendations(a, b) {
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    const priorityDelta = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return b.score - a.score;
  }

  function safeCall(fn, input, fallback) {
    try {
      return typeof fn === "function" ? fn(input) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function getNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clampScore(score) {
    return Math.max(0, Math.min(100, Math.round(getNumber(score))));
  }

  function scoreToPriority(score) {
    if (score >= 75) return "High";
    if (score >= 45) return "Medium";
    return "Low";
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(getNumber(value));
  }

  function parsePercent(value) {
    const match = String(value || "").match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function findLoan(customer, type) {
    const target = normalize(type);
    return (customer.loans || []).find(function loanMatches(loan) {
      return normalize(loan.type).includes(target);
    }) || null;
  }

  function isCurrentLoan(loan) {
    return Boolean(loan && ["current", "active", "open"].some(function statusMatches(status) {
      return normalize(loan.status).includes(status);
    }));
  }

  function hasAccountType(customer, type) {
    return getAccountBalanceByType(customer, type) > 0;
  }

  function getAccountBalanceByType(customer, type) {
    const target = normalize(type);
    return (customer.accounts || []).filter(function accountMatches(account) {
      return normalize(account.type).includes(target);
    }).reduce(function sumBalance(total, account) {
      return total + getNumber(account.balance);
    }, 0);
  }

  function getCreditCardBalance(customer) {
    return (customer.accounts || []).filter(function accountMatches(account) {
      const type = normalize(account.type);
      return type.includes("credit card") || type.includes("card");
    }).reduce(function sumBalance(total, account) {
      return total + getNumber(account.balance);
    }, 0);
  }

  function accountMaturesWithinMonths(customer, type, months, todayValue) {
    const today = parseDate(todayValue) || new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
    const target = normalize(type);

    return (customer.accounts || []).some(function accountMatches(account) {
      const status = normalize(account.status);
      const accountType = normalize(account.type);

      if (!accountType.includes(target) || !status.includes("mature")) {
        return false;
      }

      const maturityDate = parseMaturityDate(status, today.getFullYear());
      return maturityDate && maturityDate >= today && maturityDate <= maxDate;
    });
  }

  function parseMaturityDate(text, fallbackYear) {
    const match = String(text || "").match(/(\d{1,2})\/(\d{4})/);

    if (!match) {
      return null;
    }

    return new Date(Number(match[2]), Number(match[1]) - 1, 1);
  }

  function getRelationshipYears(customer) {
    const match = String(customer.relationship || "").match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function monthsSince(dateValue, todayValue) {
    const date = parseDate(dateValue);
    const today = parseDate(todayValue) || new Date();

    if (!date) {
      return 99;
    }

    return ((today.getFullYear() - date.getFullYear()) * 12) + (today.getMonth() - date.getMonth());
  }

  function getCreditScore(input) {
    return getNumber(input.context.lendingProfile && input.context.lendingProfile.creditScore) || getNumber(input.customer.creditScore) || 680;
  }

  function getFraudScore(customer) {
    return getNumber(customer.fraudRiskScore);
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    if (usMatch) {
      return new Date(Number(usMatch[3]), Number(usMatch[1]) - 1, Number(usMatch[2]));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function getToday() {
    return "2026-06-11";
  }

  return {
    ALL_RULES,
    lendingRules,
    wealthRules,
    discoverRules,
    helpers,
    evaluateRecommendations
  };
});
