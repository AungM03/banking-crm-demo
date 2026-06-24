(function attachWealthRules(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmWealthRules = api;
    return;
  }

  root.crmWealthRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWealthRules() {
  const wealthRules = [
    {
      name: "managed_investment_review",
      category: "wealth",
      product: "Managed Investment Review",
      requiredFields: ["affluencyTier", "householdBalance", "investedBalance"],
      conditions: function conditions(input) {
        return input.customer.affluencyTier >= 3 || input.customer.household >= 250000 || input.customer.investedBalance >= 100000;
      },
      exclusions: [
        {
          reason: "High fraud score. Complete fraud-safe service handling before investment outreach.",
          when: function when(input) {
            return input.helpers.getFraudScore(input.customer) >= 85;
          }
        },
        {
          reason: "Relationship is under 1 year, so start with onboarding before wealth advice.",
          when: function when(input) {
            return input.helpers.getRelationshipYears(input.customer) > 0 && input.helpers.getRelationshipYears(input.customer) < 1;
          }
        }
      ],
      score: function score(input) {
        const household = input.helpers.getNumber(input.customer.household);
        const invested = input.helpers.getNumber(input.customer.investedBalance);
        const investedRatio = household > 0 ? invested / household : 0;
        return input.helpers.clampScore(48 + (input.customer.affluencyTier >= 3 ? 18 : 0) + (household >= 500000 ? 12 : 4) + (investedRatio < 0.35 ? 14 : 5));
      },
      priority: function priority(input, score) {
        return score >= 75 ? "High" : "Medium";
      },
      reason: function reason(input) {
        return `Client has ${input.helpers.formatCurrency(input.customer.household)} in household relationship value and ${input.helpers.formatCurrency(input.customer.investedBalance)} invested with the bank.`;
      },
      nextAction: "Schedule a wealth advisor consultation and review investment objectives.",
      abTestKey: "investment_review"
    },
    {
      name: "cd_ladder_strategy",
      category: "wealth",
      product: "CD Ladder Strategy",
      requiredFields: ["customer_accounts"],
      conditions: function conditions(input) {
        return input.helpers.hasAccountType(input.customer, "cd");
      },
      score: function score(input) {
        const cdBalance = input.helpers.getAccountBalanceByType(input.customer, "cd");
        return input.helpers.clampScore(50 + (cdBalance >= 50000 ? 16 : 6) + (input.helpers.accountMaturesWithinMonths(input.customer, "cd", 6, input.context.today) ? 14 : 0));
      },
      priority: function priority(input, score) {
        return score >= 70 ? "High" : "Medium";
      },
      reason: "Customer already holds CD balances and may benefit from staged maturities.",
      nextAction: "Discuss liquidity needs, maturity timing, and renewal options.",
      abTestKey: "cd_ladder"
    },
    {
      name: "asset_allocation_review",
      category: "wealth",
      product: "Asset Allocation Review",
      requiredFields: ["wealthProfile", "savingsBalance", "investedBalance"],
      conditions: function conditions(input) {
        const isWealthCandidate = input.customer.affluencyTier >= 2 ||
          input.customer.household >= 100000 ||
          input.customer.investedBalance >= 25000 ||
          input.helpers.normalize(input.customer.wealthAdvisor) !== "not assigned";
        const concentration = input.helpers.normalize(input.context.wealthProfile && input.context.wealthProfile.concentrationConcerns);
        const savings = input.helpers.getNumber(input.customer.savings);
        const invested = input.helpers.getNumber(input.customer.investedBalance);
        return isWealthCandidate && (Boolean(concentration && !concentration.includes("none")) || savings > invested * 0.45);
      },
      score: function score(input) {
        const savings = input.helpers.getNumber(input.customer.savings);
        const invested = input.helpers.getNumber(input.customer.investedBalance);
        return input.helpers.clampScore(44 + (savings > invested * 0.45 ? 18 : 6) + (input.customer.affluencyTier >= 3 ? 10 : 0));
      },
      reason: "Balances or profile notes suggest the customer may be concentrated in cash, CDs, real estate, or a narrow investment mix.",
      nextAction: "Review current allocation and document risk tolerance, liquidity needs, and time horizon.",
      abTestKey: "allocation_review"
    },
    {
      name: "tax_planning_consultation",
      category: "wealth",
      product: "Tax Planning Consultation",
      requiredFields: ["wealthProfile.taxStatus", "householdBalance"],
      conditions: function conditions(input) {
        const taxStatus = input.helpers.normalize(input.context.wealthProfile && input.context.wealthProfile.taxStatus);
        return input.customer.household >= 300000 || taxStatus.includes("tax") || taxStatus.includes("business") || taxStatus.includes("joint");
      },
      score: function score(input) {
        const household = input.helpers.getNumber(input.customer.household);
        return input.helpers.clampScore(42 + (household >= 500000 ? 18 : 8) + (input.customer.businessAccounts && input.customer.businessAccounts.length ? 10 : 0));
      },
      priority: "Medium",
      reason: "Higher-value or business-owner relationships may benefit from tax-sensitive planning conversations.",
      nextAction: "Coordinate with the wealth advisor and remind the client to consult their tax professional.",
      abTestKey: "tax_planning"
    },
    {
      name: "beneficiary_review",
      category: "wealth",
      product: "Beneficiary Review",
      requiredFields: ["relationshipLength", "wealthProfile.lastMeetingDate"],
      conditions: function conditions(input) {
        return input.customer.affluencyTier >= 2 || input.customer.investedBalance >= 25000;
      },
      score: function score(input) {
        const monthsSinceMeeting = input.helpers.monthsSince(input.context.wealthProfile && input.context.wealthProfile.lastMeetingDate, input.context.today);
        return input.helpers.clampScore(48 + (monthsSinceMeeting >= 12 ? 16 : 4) + (input.customer.affluencyTier >= 3 ? 8 : 0));
      },
      priority: "Medium",
      reason: "Periodic beneficiary and titling reviews help keep client plans current.",
      nextAction: "Ask whether beneficiaries, life events, or account titling have changed.",
      abTestKey: "beneficiary_review"
    },
    {
      name: "savings_optimization",
      category: "wealth",
      product: "Savings Optimization",
      requiredFields: ["savingsBalance", "investedBalance"],
      conditions: function conditions(input) {
        return input.customer.savings >= 25000 && input.customer.savings > input.customer.investedBalance * 0.3;
      },
      exclusions: [
        {
          reason: "Savings balance appears to support short-term liquidity needs, so do not push investment conversion.",
          when: function when(input) {
            const liquidity = input.helpers.normalize(input.context.wealthProfile && input.context.wealthProfile.liquidityNeeds);
            return liquidity.includes("short-term") || liquidity.includes("immediate");
          }
        }
      ],
      score: function score(input) {
        const savings = input.helpers.getNumber(input.customer.savings);
        return input.helpers.clampScore(44 + (savings >= 100000 ? 18 : 8) + (input.customer.affluencyTier >= 3 ? 8 : 0));
      },
      reason: "Savings balance may be above the customer's stated liquidity need.",
      nextAction: "Review emergency reserve, near-term spending, CDs, and investment alternatives.",
      abTestKey: "savings_optimization"
    }
  ];

  return { wealthRules };
});
