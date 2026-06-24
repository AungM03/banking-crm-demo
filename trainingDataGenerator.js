(function attachTrainingDataGenerator(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmTrainingDataGenerator = api;
    return;
  }

  root.crmTrainingDataGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTrainingDataGenerator() {
  const FEATURE_NAMES = [
    "age",
    "householdBalance",
    "investedBalance",
    "wealthGap",
    "creditScore",
    "fraudScore",
    "daysLastContact",
    "meetingsLastYear",
    "hasInvestments",
    "hasMortgage",
    "relationshipYears",
    "accountCount",
    "engagementScore",
    "savingsRate",
    "debtToIncome"
  ];

  const PRODUCT_KEYS = {
    INVESTMENT_REVIEW: "investment_review",
    MORTGAGE_REFINANCE: "mortgage_refinance"
  };

  function generateTrainingData(customers, productKey, context) {
    const safeContext = {
      today: "2026-06-11",
      meetings: [],
      lendingProfiles: {},
      ...context
    };
    const baseCustomers = Array.isArray(customers) ? customers : [];
    const expandedCustomers = expandCustomerSet(baseCustomers, safeContext.syntheticCopies || 24);

    return expandedCustomers.map(function mapCustomer(customer, index) {
      const features = computeFeatures(customer, {
        ...safeContext,
        syntheticIndex: index
      });

      return {
        accountNumber: customer.accountNumber || `SYN-${index + 1}`,
        productKey,
        features,
        label: assignOutcomeLabel(productKey, features, customer, index)
      };
    });
  }

  function generateTrainingDataForProducts(customers, productKeys, context) {
    return (productKeys || Object.values(PRODUCT_KEYS)).reduce(function reduceProducts(result, productKey) {
      result[productKey] = generateTrainingData(customers, productKey, context);
      return result;
    }, {});
  }

  function computeFeatures(customer, context) {
    const safeCustomer = customer || {};
    const safeContext = context || {};
    const householdBalance = getNumber(safeCustomer.household || safeCustomer.householdBalance);
    const checkingBalance = getNumber(safeCustomer.checking || safeCustomer.checkingBalance);
    const savingsBalance = getNumber(safeCustomer.savings || safeCustomer.savingsBalance);
    const investedBalance = getNumber(safeCustomer.investedBalance);
    const loanBalance = getLoanBalance(safeCustomer);
    const monthlyIncome = getMonthlyIncome(safeCustomer, safeContext);
    const daysLastContact = getDaysSinceLastContact(safeCustomer, safeContext);
    const meetingsLastYear = getMeetingsLastYear(safeCustomer, safeContext);
    const noteCount = Array.isArray(safeCustomer.notes) ? safeCustomer.notes.length : 0;
    const rawEngagement = (meetingsLastYear * 10) + (noteCount * 3) + Math.max(0, 90 - daysLastContact) / 6;

    return {
      age: getAge(safeCustomer, safeContext.today),
      householdBalance,
      investedBalance,
      wealthGap: householdBalance > 0 ? clamp01(1 - (investedBalance / householdBalance)) : 0,
      creditScore: getCreditScore(safeCustomer, safeContext),
      fraudScore: getNumber(safeCustomer.fraudRiskScore || safeCustomer.fraudScore),
      daysLastContact,
      meetingsLastYear,
      hasInvestments: investedBalance > 0 ? 1 : 0,
      hasMortgage: hasLoanType(safeCustomer, "mortgage") ? 1 : 0,
      relationshipYears: getRelationshipYears(safeCustomer),
      accountCount: Array.isArray(safeCustomer.accounts) ? safeCustomer.accounts.length : 0,
      engagementScore: clamp01(rawEngagement / 100),
      savingsRate: householdBalance > 0 ? clamp01(savingsBalance / householdBalance) : 0,
      debtToIncome: monthlyIncome > 0 ? clamp01(loanBalance / (monthlyIncome * 12 * 5)) : 0,
      checkingBalance
    };
  }

  function assignOutcomeLabel(productKey, features, customer, index) {
    const probability = getSyntheticAcceptanceProbability(productKey, features, customer);
    const jitter = (seededRandom(`${productKey}:${customer.accountNumber || index}:${index}`) - 0.5) * 0.08;
    const cutoff = productKey === PRODUCT_KEYS.MORTGAGE_REFINANCE ? 0.48 : 0.74;
    return probability + jitter >= cutoff ? 1 : 0;
  }

  function getSyntheticAcceptanceProbability(productKey, features, customer) {
    const fraudPenalty = features.fraudScore >= 80 ? 0.65 : features.fraudScore / 180;

    if (productKey === PRODUCT_KEYS.INVESTMENT_REVIEW) {
      const score =
        -1.9 +
        (features.householdBalance / 1000000) * 2.2 +
        features.wealthGap * 1.9 +
        features.engagementScore * 2.3 +
        features.hasInvestments * 0.6 +
        Math.min(features.relationshipYears, 20) * 0.035 +
        features.savingsRate * 0.8 -
        fraudPenalty;
      return sigmoid(score);
    }

    if (productKey === PRODUCT_KEYS.MORTGAGE_REFINANCE) {
      const score =
        -2.2 +
        features.hasMortgage * 2.1 +
        ((features.creditScore - 620) / 230) * 1.6 +
        (features.householdBalance / 750000) * 0.9 +
        features.engagementScore * 1.1 +
        Math.min(features.relationshipYears, 20) * 0.025 -
        features.debtToIncome * 1.1 -
        fraudPenalty;
      return sigmoid(score);
    }

    return 0.5;
  }

  function expandCustomerSet(customers, copiesPerCustomer) {
    if (!customers.length) {
      return createDefaultSyntheticCustomers(240);
    }

    const expanded = [];
    customers.forEach(function expandCustomer(customer, customerIndex) {
      expanded.push(customer);

      for (let copyIndex = 0; copyIndex < copiesPerCustomer; copyIndex += 1) {
        expanded.push(createSyntheticVariant(customer, customerIndex, copyIndex));
      }
    });

    return expanded;
  }

  function createSyntheticVariant(customer, customerIndex, copyIndex) {
    const seed = `${customer.accountNumber || customerIndex}:${copyIndex}`;
    const balanceFactor = 0.55 + (seededRandom(`${seed}:balance`) * 1.4);
    const investedFactor = 0.2 + (seededRandom(`${seed}:invested`) * 1.6);
    const savingsFactor = 0.35 + (seededRandom(`${seed}:savings`) * 1.3);
    const fraudOffset = Math.round((seededRandom(`${seed}:fraud`) - 0.5) * 42);
    const relationshipOffset = Math.round((seededRandom(`${seed}:relationship`) - 0.5) * 8);
    const accounts = Array.isArray(customer.accounts) ? customer.accounts.slice() : [];
    const loans = Array.isArray(customer.loans) ? customer.loans.slice() : [];

    return {
      ...customer,
      accountNumber: `${customer.accountNumber || "SYN"}-${copyIndex + 1}`,
      household: Math.round(getNumber(customer.household || customer.householdBalance) * balanceFactor),
      savings: Math.round(getNumber(customer.savings || customer.savingsBalance) * savingsFactor),
      investedBalance: Math.round(getNumber(customer.investedBalance) * investedFactor),
      fraudRiskScore: Math.max(0, Math.min(100, getNumber(customer.fraudRiskScore) + fraudOffset)),
      relationship: `${Math.max(0.5, getRelationshipYears(customer) + relationshipOffset)} years`,
      accounts,
      loans
    };
  }

  function createDefaultSyntheticCustomers(count) {
    return Array.from({ length: count }, function createCustomer(_, index) {
      const seed = `default:${index}`;
      const household = Math.round(40000 + seededRandom(`${seed}:household`) * 1100000);
      const investedRatio = seededRandom(`${seed}:invested`) * 0.7;
      const hasMortgage = seededRandom(`${seed}:mortgage`) > 0.42;

      return {
        accountNumber: `SYN-${index + 1}`,
        dob: `${String(1 + Math.floor(seededRandom(`${seed}:month`) * 12)).padStart(2, "0")}/15/${1960 + Math.floor(seededRandom(`${seed}:year`) * 35)}`,
        household,
        checking: Math.round(household * 0.05),
        savings: Math.round(household * (0.05 + seededRandom(`${seed}:savings`) * 0.35)),
        investedBalance: Math.round(household * investedRatio),
        fraudRiskScore: Math.round(seededRandom(`${seed}:fraud`) * 95),
        relationship: `${1 + Math.floor(seededRandom(`${seed}:relationship`) * 20)} years`,
        accounts: [
          { type: "Checking", balance: Math.round(household * 0.05) },
          { type: "Savings", balance: Math.round(household * 0.18) }
        ],
        loans: hasMortgage ? [{ type: "Mortgage", balance: Math.round(household * 0.45), status: "Current" }] : [],
        notes: []
      };
    });
  }

  function getAge(customer, todayValue) {
    const today = parseDate(todayValue) || new Date();
    const dob = parseDate(customer.dob);

    if (!dob) {
      return 45;
    }

    let age = today.getFullYear() - dob.getFullYear();
    const hadBirthday = today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    return hadBirthday ? age : age - 1;
  }

  function getCreditScore(customer, context) {
    const profile = getContextProfile(customer, context);
    const explicitScore = getNumber(profile && profile.creditScore) || getNumber(customer.creditScore);

    if (explicitScore) {
      return explicitScore;
    }

    const fraudScore = getNumber(customer.fraudRiskScore);
    const relationshipYears = getRelationshipYears(customer);
    return Math.max(560, Math.min(820, 705 + (relationshipYears * 3) - Math.round(fraudScore / 3)));
  }

  function getMonthlyIncome(customer, context) {
    const profile = getContextProfile(customer, context);
    return getNumber(profile && profile.monthlyIncome) ||
      Math.max(3500, Math.round(getNumber(customer.household || customer.householdBalance) / 70));
  }

  function getContextProfile(customer, context) {
    const accountNumber = customer && String(customer.accountNumber || "").split("-")[0];
    return (context && context.lendingProfiles && context.lendingProfiles[accountNumber]) ||
      (context && context.lendingProfile) ||
      null;
  }

  function getDaysSinceLastContact(customer, context) {
    const today = parseDate(context.today) || new Date();
    const dates = [];

    (customer.notes || []).forEach(function addNoteDate(note) {
      if (note.date) dates.push(note.date);
    });

    (context.meetings || []).forEach(function addMeetingDate(meeting) {
      if (meeting.accountNumber === customer.accountNumber && meeting.meetingDate) {
        dates.push(meeting.meetingDate);
      }
    });

    const latest = dates.map(parseDate).filter(Boolean).sort(function sortDates(a, b) {
      return b - a;
    })[0];

    if (!latest) {
      return 120;
    }

    return Math.max(0, Math.round((today - latest) / 86400000));
  }

  function getMeetingsLastYear(customer, context) {
    const today = parseDate(context.today) || new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    return (context.meetings || []).filter(function isMeetingForCustomer(meeting) {
      const meetingDate = parseDate(meeting.meetingDate || meeting.date);
      return meeting.accountNumber === customer.accountNumber && meetingDate && meetingDate >= oneYearAgo && meetingDate <= today;
    }).length;
  }

  function getLoanBalance(customer) {
    return (customer.loans || []).reduce(function sumLoans(total, loan) {
      return total + getNumber(loan.balance);
    }, 0);
  }

  function hasLoanType(customer, type) {
    const target = normalize(type);
    return (customer.loans || []).some(function loanMatches(loan) {
      return normalize(loan.type).includes(target);
    });
  }

  function getRelationshipYears(customer) {
    const match = String(customer.relationship || "").match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function parseDate(value) {
    if (!value) return null;
    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function getNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, getNumber(value)));
  }

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
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
    FEATURE_NAMES,
    PRODUCT_KEYS,
    computeFeatures,
    generateTrainingData,
    generateTrainingDataForProducts,
    assignOutcomeLabel,
    getSyntheticAcceptanceProbability
  };
});
