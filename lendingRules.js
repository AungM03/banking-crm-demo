(function attachLendingRules(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmLendingRules = api;
    return;
  }

  root.crmLendingRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLendingRules() {
  const lendingRules = [
    {
      name: "mortgage_refinance_high_rate",
      category: "lending",
      product: "Mortgage Refinance Review",
      requiredFields: ["loans", "creditScore or lendingProfile.creditScore", "lendingProfile.interestRate"],
      conditions: function conditions(input) {
        const mortgage = input.helpers.findLoan(input.customer, "mortgage");
        return Boolean(mortgage && input.helpers.isCurrentLoan(mortgage) && input.helpers.getCreditScore(input) >= 680);
      },
      exclusions: [
        {
          reason: "High fraud score. Complete fraud-safe service handling before new credit outreach.",
          when: function when(input) {
            return input.helpers.getFraudScore(input.customer) >= 85;
          }
        }
      ],
      score: function score(input) {
        const rate = input.helpers.parsePercent(input.context.lendingProfile && input.context.lendingProfile.interestRate);
        const creditScore = input.helpers.getCreditScore(input);
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        return input.helpers.clampScore(50 + (rate >= 7 ? 12 : 4) + (creditScore >= 740 ? 12 : 6) + (homeEquity >= 75000 ? 10 : 0));
      },
      priority: function priority(input, score) {
        return score >= 72 ? "High" : "Medium";
      },
      reason: function reason(input) {
        const rate = input.context.lendingProfile && input.context.lendingProfile.interestRate;
        return `Active mortgage relationship, good credit profile, and current rate ${rate || "available for review"}.`;
      },
      nextAction: "Compare current rate to market rates and contact customer about refinance fit.",
      abTestKey: "mortgage_refi_vs_heloc"
    },
    {
      name: "heloc_home_equity_access",
      category: "lending",
      product: "HELOC / Home Equity Access",
      requiredFields: ["lendingProfile.homeEquity", "loans"],
      conditions: function conditions(input) {
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        return homeEquity >= 50000 || Boolean(input.helpers.findLoan(input.customer, "mortgage") && input.customer.household >= 200000);
      },
      exclusions: [
        {
          reason: "Past due amount should be resolved before new home equity discussion.",
          when: function when(input) {
            return input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.pastDueAmount) > 0;
          }
        },
        {
          reason: "High fraud score. Avoid new credit product outreach until risk handling is complete.",
          when: function when(input) {
            return input.helpers.getFraudScore(input.customer) >= 85;
          }
        }
      ],
      score: function score(input) {
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        const monthlyIncome = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.monthlyIncome);
        return input.helpers.clampScore(46 + (homeEquity >= 100000 ? 18 : 8) + (monthlyIncome >= 8000 ? 10 : 0) + (input.customer.household >= 300000 ? 8 : 0));
      },
      priority: function priority(input, score) {
        return score >= 70 ? "High" : "Medium";
      },
      reason: function reason(input) {
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        return `Home equity estimate of ${input.helpers.formatCurrency(homeEquity)} may support a flexible line of credit conversation.`;
      },
      nextAction: "Ask about upcoming repairs, education, consolidation, or liquidity needs.",
      abTestKey: "mortgage_refi_vs_heloc"
    },
    {
      name: "pmi_removal_review",
      category: "lending",
      product: "PMI Review",
      requiredFields: ["lendingProfile.pmiStatus", "lendingProfile.homeEquity"],
      conditions: function conditions(input) {
        const pmiStatus = input.helpers.normalize(input.context.lendingProfile && input.context.lendingProfile.pmiStatus);
        const recommendation = input.helpers.normalize(input.context.lendingProfile && input.context.lendingProfile.pmiRecommendation);
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        return (pmiStatus.includes("active") || recommendation.includes("review") || recommendation.includes("remove")) && homeEquity >= 25000;
      },
      score: function score(input) {
        const homeEquity = input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.homeEquity);
        return input.helpers.clampScore(52 + (homeEquity >= 75000 ? 18 : 8));
      },
      reason: "Customer may be close to removing or reviewing PMI based on current equity profile.",
      nextAction: "Review loan-to-value, current appraisal needs, and PMI removal requirements.",
      abTestKey: "pmi_review"
    },
    {
      name: "auto_loan_renewal",
      category: "lending",
      product: "Auto Loan Renewal",
      requiredFields: ["loans"],
      conditions: function conditions(input) {
        const autoLoan = input.helpers.findLoan(input.customer, "auto");
        return Boolean(autoLoan && input.helpers.isCurrentLoan(autoLoan) && input.helpers.getNumber(autoLoan.balance) <= 25000);
      },
      score: function score(input) {
        const autoLoan = input.helpers.findLoan(input.customer, "auto");
        const balance = input.helpers.getNumber(autoLoan && autoLoan.balance);
        return input.helpers.clampScore(44 + (balance <= 12000 ? 18 : 8) + (input.helpers.getCreditScore(input) >= 700 ? 8 : 0));
      },
      priority: "Medium",
      reason: "Auto loan balance suggests payoff or replacement financing may be coming up.",
      nextAction: "Ask whether the customer plans to keep, trade, or replace the vehicle.",
      abTestKey: "auto_renewal"
    },
    {
      name: "loan_consolidation",
      category: "lending",
      product: "Loan Consolidation",
      requiredFields: ["loans", "customer_accounts"],
      conditions: function conditions(input) {
        const activeLoans = (input.customer.loans || []).filter(input.helpers.isCurrentLoan);
        const creditCardBalance = input.helpers.getCreditCardBalance(input.customer);
        return activeLoans.length >= 2 || (creditCardBalance >= 3000 && activeLoans.length >= 1);
      },
      exclusions: [
        {
          reason: "Past due amount should be reviewed before consolidation outreach.",
          when: function when(input) {
            return input.helpers.getNumber(input.context.lendingProfile && input.context.lendingProfile.pastDueAmount) > 0;
          }
        }
      ],
      score: function score(input) {
        const activeLoans = (input.customer.loans || []).filter(input.helpers.isCurrentLoan).length;
        const creditCardBalance = input.helpers.getCreditCardBalance(input.customer);
        return input.helpers.clampScore(42 + (activeLoans * 8) + (creditCardBalance >= 5000 ? 16 : 4));
      },
      reason: "Multiple credit obligations may become one cleaner payment structure.",
      nextAction: "Review payment history, balances, and whether consolidation would lower monthly obligations.",
      abTestKey: "consolidation_offer"
    },
    {
      name: "credit_card_payoff",
      category: "lending",
      product: "Credit Card Payoff Plan",
      requiredFields: ["customer_accounts", "savingsBalance"],
      conditions: function conditions(input) {
        const creditCardBalance = input.helpers.getCreditCardBalance(input.customer);
        return creditCardBalance >= 2500 && input.helpers.getNumber(input.customer.savings) >= 5000;
      },
      score: function score(input) {
        const creditCardBalance = input.helpers.getCreditCardBalance(input.customer);
        const savings = input.helpers.getNumber(input.customer.savings);
        return input.helpers.clampScore(40 + (creditCardBalance >= 8000 ? 18 : 8) + (savings >= creditCardBalance * 2 ? 12 : 4));
      },
      priority: function priority(input, score) {
        return score >= 70 ? "High" : "Medium";
      },
      reason: "Customer has credit card exposure and available deposit balances that may support a payoff strategy.",
      nextAction: "Discuss payoff options, monthly cash flow, and whether a lower-rate loan is appropriate.",
      abTestKey: "card_payoff"
    }
  ];

  return { lendingRules };
});
