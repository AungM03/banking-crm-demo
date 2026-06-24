(function attachDiscoverRules(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmDiscoverRules = api;
    return;
  }

  root.crmDiscoverRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDiscoverRules() {
  const discoverRules = [
    {
      name: "fraud_safe_service_review",
      category: "discover",
      product: "Digital Safety Review",
      requiredFields: ["fraudRiskScore"],
      conditions: function conditions(input) {
        return input.helpers.getFraudScore(input.customer) >= 65;
      },
      score: function score(input) {
        return input.helpers.clampScore(56 + Math.round(input.helpers.getFraudScore(input.customer) / 4));
      },
      priority: "High",
      reason: "Fraud score is elevated, so protection should be the first relationship conversation.",
      nextAction: "Review alerts, card controls, authentication, trusted contacts, and safe contact practices.",
      abTestKey: "digital_safety_review"
    },
    {
      name: "cd_maturity_event",
      category: "discover",
      product: "CD Maturity Conversation",
      requiredFields: ["customer_accounts"],
      conditions: function conditions(input) {
        return input.helpers.accountMaturesWithinMonths(input.customer, "cd", 6, input.context.today);
      },
      score: 78,
      priority: "High",
      reason: "A CD is close enough to maturity for renewal, laddering, or liquidity planning.",
      nextAction: "Contact the customer before maturity and compare renewal options.",
      abTestKey: "cd_maturity"
    },
    {
      name: "high_savings_low_investment_gap",
      category: "discover",
      product: "Investment Gap Conversation",
      requiredFields: ["savingsBalance", "investedBalance", "affluencyTier"],
      conditions: function conditions(input) {
        return input.customer.savings >= 50000 && input.customer.investedBalance < input.customer.savings;
      },
      exclusions: [
        {
          reason: "High fraud score. Service protection should happen before growth outreach.",
          when: function when(input) {
            return input.helpers.getFraudScore(input.customer) >= 85;
          }
        }
      ],
      score: function score(input) {
        return input.helpers.clampScore(54 + (input.customer.affluencyTier >= 3 ? 14 : 4) + (input.customer.savings >= 100000 ? 10 : 0));
      },
      priority: function priority(input, score) {
        return score >= 75 ? "High" : "Medium";
      },
      reason: "Customer has meaningful savings balances but lower invested relationship depth.",
      nextAction: "Ask about liquidity needs and offer a warm referral to a wealth advisor if appropriate.",
      abTestKey: "investment_gap"
    },
    {
      name: "new_customer_relationship_review",
      category: "discover",
      product: "Relationship Review",
      requiredFields: ["relationship"],
      conditions: function conditions(input) {
        const years = input.helpers.getRelationshipYears(input.customer);
        return years > 0 && years <= 1;
      },
      score: 58,
      priority: "Medium",
      reason: "Newer relationships need product fit discovery and onboarding follow-up.",
      nextAction: "Review direct deposit, digital banking, savings goals, and service preferences.",
      abTestKey: "new_customer_onboarding"
    },
    {
      name: "business_owner_lending_fit",
      category: "discover",
      product: "Business Lending Conversation",
      requiredFields: ["businessAccounts"],
      conditions: function conditions(input) {
        return Boolean(input.customer.businessAccounts && input.customer.businessAccounts.length);
      },
      score: function score(input) {
        const businessValue = (input.customer.businessAccounts || []).reduce(function sumValue(total, account) {
          return total + input.helpers.getNumber(account.relationshipValue);
        }, 0);
        return input.helpers.clampScore(52 + (businessValue >= 100000 ? 18 : 8));
      },
      priority: function priority(input, score) {
        return score >= 70 ? "High" : "Medium";
      },
      reason: "Customer has a linked business relationship that may need operating, equipment, or line-of-credit support.",
      nextAction: "Ask about working capital, equipment needs, seasonal cash flow, and business deposit growth.",
      abTestKey: "business_lending"
    },
    {
      name: "loan_payment_review",
      category: "discover",
      product: "Loan Payment Review",
      requiredFields: ["loans"],
      conditions: function conditions(input) {
        return (input.customer.loans || []).some(input.helpers.isCurrentLoan);
      },
      score: function score(input) {
        const loanCount = (input.customer.loans || []).filter(input.helpers.isCurrentLoan).length;
        return input.helpers.clampScore(48 + (loanCount * 8) + (input.helpers.getCreditScore(input) >= 700 ? 8 : 0));
      },
      priority: "Medium",
      reason: "Active loan relationship creates a natural service conversation around payment fit and terms.",
      nextAction: "Review payment comfort, maturity date, rate, and refinance eligibility.",
      abTestKey: "loan_payment_review"
    }
  ];

  return { discoverRules };
});
