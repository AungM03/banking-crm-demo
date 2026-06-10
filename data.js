window.crmCustomers = [
  {
    accountNumber: "10024588",
    name: "Elise Parker",
    ssn: "000-12-1001",
    cif: "CIF-8842391",
    dob: "03/18/1977",
    zip: "46204",
    relationship: "13 years",
    address: "214 N Meridian St, Indianapolis, IN 46204",
    phone: "317-555-0188",
    email: "elise.parker@example.com",
    primaryBranch: "Indianapolis Downtown",
    personalBanker: "Nora Whitfield",
    wealthAdvisor: "Avery Chen",
    checking: 24780,
    savings: 98300,
    household: 428940,
    investedBalance: 236520,
    affluencyTier: 3,
    profitability: {
      tier: "High",
      annualContribution: 4850,
      mainDriver: "Mortgage, deposits, investments, and business services",
      watchItem: "High fraud score requires careful service handling"
    },
    businessAccounts: [
      {
        businessName: "Parker Design Studio LLC",
        role: "Owner",
        products: "Business Checking, Merchant Services, Business Credit Card",
        relationshipValue: 86400
      }
    ],
    accounts: [
      { type: "Premier Checking", account: "10024588", status: "Open", openDate: "04/12/2013", balance: 24780 },
      { type: "Money Market Savings", account: "20024588", status: "Open", openDate: "09/03/2015", balance: 98300 },
      { type: "12 Month CD", account: "30024588", status: "Matures 09/2026", openDate: "09/18/2025", balance: 63240 }
    ],
    householdMembers: [
      { name: "Elise Parker", relationship: "Primary", products: "Checking, Savings, Mortgage" },
      { name: "Jordan Parker", relationship: "Spouse", products: "Joint Savings, Auto Loan" }
    ],
    fraudRiskScore: 72,
    fraudRiskTier: "High",
    fraudCases: 2,
    frontlineNotes: 3,
    lastReviewed: "05/28/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 1, impact: 22 },
      { type: "Card Fraud", count: 1, impact: 14 },
      { type: "Suspicious Login", count: 3, impact: 18 },
      { type: "Phishing Concern", count: 2, impact: 10 }
    ],
    fraudDrivers: [
      "Prior account takeover case",
      "Recent suspicious login activity",
      "Frontline escalation notes",
      "High-value transaction exposure"
    ],
    discoverNeeds: [
      {
        product: "Managed Investment Review",
        priority: "High",
        reason: "Affluency tier 3 client with significant invested balance and savings activity.",
        nextAction: "Schedule a wealth advisor consultation.",
        status: "Ready for outreach"
      },
      {
        product: "Mortgage Refinance Review",
        priority: "Medium",
        reason: "Active mortgage relationship with enough household value for a refinance conversation.",
        nextAction: "Review current mortgage terms with the client.",
        status: "Needs banker review"
      },
      {
        product: "CD Ladder Strategy",
        priority: "Medium",
        reason: "Client already holds a CD and has balances that may benefit from staged maturities.",
        nextAction: "Discuss liquidity needs and renewal timing.",
        status: "Opportunity identified"
      }
    ],
    nextBestAction: {
      title: "Schedule wealth consultation",
      priority: "High",
      reason: "Tier 3 affluency client with strong invested balance and assigned wealth advisor.",
      banker: "Nora Whitfield",
      due: "06/07/2026"
    },
    alerts: [
      { label: "CD maturity conversation available", type: "Opportunity" },
      { label: "Fraud matrix score is high", type: "Risk" },
      { label: "Wealth advisor assigned", type: "Relationship" }
    ],
    notes: [
      { author: "Nora Whitfield", date: "05/29/2026", text: "Client asked about conservative investment options." },
      { author: "Branch Teller", date: "05/28/2026", text: "Confirmed updated phone number during branch visit." }
    ],
    loans: [
      { type: "Mortgage", balance: 221400, status: "Current", paymentStatus: "Next due 06/15/2026" },
      { type: "Auto Loan", balance: 21120, status: "Current", paymentStatus: "Next due 06/22/2026" }
    ]
  },
  {
    accountNumber: "10031942",
    name: "Marcus Reed",
    ssn: "000-12-1002",
    cif: "CIF-3194207",
    dob: "11/02/1985",
    zip: "46220",
    relationship: "8 years",
    address: "728 Broad Ripple Ave, Indianapolis, IN 46220",
    phone: "317-555-0142",
    email: "marcus.reed@example.com",
    primaryBranch: "Broad Ripple",
    personalBanker: "Caleb Martin",
    wealthAdvisor: "Not assigned",
    checking: 6420,
    savings: 18450,
    household: 38620,
    investedBalance: 7200,
    affluencyTier: 1,
    profitability: {
      tier: "Medium",
      annualContribution: 920,
      mainDriver: "Personal loan and deposit relationship",
      watchItem: "Recent card dispute"
    },
    businessAccounts: [],
    accounts: [
      { type: "Everyday Checking", account: "10031942", status: "Open", openDate: "07/29/2018", balance: 6420 },
      { type: "Statement Savings", account: "20031942", status: "Open", openDate: "08/02/2018", balance: 18450 },
      { type: "Rewards Credit Card", account: "40031942", status: "Active", openDate: "01/15/2021", balance: 3950 }
    ],
    householdMembers: [
      { name: "Marcus Reed", relationship: "Primary", products: "Checking, Savings, Personal Loan" },
      { name: "Tasha Reed", relationship: "Authorized User", products: "Credit Card" }
    ],
    fraudRiskScore: 54,
    fraudRiskTier: "Medium",
    fraudCases: 1,
    frontlineNotes: 1,
    lastReviewed: "05/19/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 1, impact: 16 },
      { type: "Suspicious Login", count: 2, impact: 14 },
      { type: "Phishing Concern", count: 1, impact: 8 }
    ],
    fraudDrivers: [
      "Recent card dispute",
      "New device activity",
      "One frontline observation",
      "Moderate account tenure"
    ],
    discoverNeeds: [
      {
        product: "High-Yield Savings Conversion",
        priority: "High",
        reason: "Savings balance is growing and could be moved into a better-fit savings product.",
        nextAction: "Compare current savings yield with high-yield option.",
        status: "Ready for banker conversation"
      },
      {
        product: "Personal Loan Refinance",
        priority: "Medium",
        reason: "Client has an active personal loan that may qualify for payment or rate review.",
        nextAction: "Review loan terms and payment history.",
        status: "Needs lending review"
      },
      {
        product: "Credit Card Rewards Review",
        priority: "Low",
        reason: "Rewards card is active and may benefit from spending-category alignment.",
        nextAction: "Ask about top monthly spending categories.",
        status: "Optional discussion"
      }
    ],
    nextBestAction: {
      title: "Review savings options",
      priority: "High",
      reason: "Savings balance is large enough for a high-yield savings conversation.",
      banker: "Caleb Martin",
      due: "06/05/2026"
    },
    alerts: [
      { label: "Personal loan review available", type: "Opportunity" },
      { label: "Recent card dispute", type: "Service" },
      { label: "Savings product fit opportunity", type: "Opportunity" }
    ],
    notes: [
      { author: "Caleb Martin", date: "05/21/2026", text: "Client may be interested in lowering personal loan payment." },
      { author: "Contact Center", date: "05/19/2026", text: "Client called about rewards card dispute timeline." }
    ],
    loans: [
      { type: "Personal Loan", balance: 9800, status: "Current", paymentStatus: "Next due 06/10/2026" }
    ]
  },
  {
    accountNumber: "10058217",
    name: "Dana Collins",
    ssn: "000-12-1003",
    cif: "CIF-5821712",
    dob: "06/29/1969",
    zip: "46032",
    relationship: "21 years",
    address: "1188 Oak Ridge Dr, Carmel, IN 46032",
    phone: "317-555-0103",
    email: "dana.collins@example.com",
    primaryBranch: "Carmel",
    personalBanker: "Iris Bennett",
    wealthAdvisor: "Victor Hale",
    checking: 18220,
    savings: 156900,
    household: 312700,
    investedBalance: 188480,
    affluencyTier: 3,
    profitability: {
      tier: "High",
      annualContribution: 3420,
      mainDriver: "High deposits, HELOC, and wealth opportunity",
      watchItem: "Review HELOC renewal timing"
    },
    businessAccounts: [
      {
        businessName: "Collins Properties LLC",
        role: "Managing Member",
        products: "Business Checking, Line of Credit",
        relationshipValue: 142800
      }
    ],
    accounts: [
      { type: "Premier Checking", account: "10058217", status: "Open", openDate: "03/04/2005", balance: 18220 },
      { type: "High Yield Savings", account: "20058217", status: "Open", openDate: "03/04/2005", balance: 156900 },
      { type: "36 Month CD", account: "30058217", status: "Matures 12/2027", openDate: "12/11/2024", balance: 94000 }
    ],
    householdMembers: [
      { name: "Dana Collins", relationship: "Primary", products: "Checking, Savings, HELOC" },
      { name: "Morgan Collins", relationship: "Joint Owner", products: "Joint Checking, CD" }
    ],
    fraudRiskScore: 24,
    fraudRiskTier: "Low",
    fraudCases: 0,
    frontlineNotes: 0,
    lastReviewed: "05/12/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 1, impact: 6 },
      { type: "Phishing Concern", count: 0, impact: 0 }
    ],
    fraudDrivers: [
      "No recent fraud cases",
      "Stable login behavior",
      "Long relationship history",
      "Low frontline concern volume"
    ],
    discoverNeeds: [
      {
        product: "Wealth Planning Review",
        priority: "High",
        reason: "Affluency tier 3 client with long tenure and strong deposit balances.",
        nextAction: "Set a joint banker and wealth advisor review.",
        status: "Ready for outreach"
      },
      {
        product: "Home Equity Line Review",
        priority: "Medium",
        reason: "Existing HELOC relationship may need a limit, rate, or draw-period review.",
        nextAction: "Review HELOC usage and upcoming renewal dates.",
        status: "Needs lending review"
      },
      {
        product: "Premium Savings Strategy",
        priority: "Medium",
        reason: "High savings balance may benefit from product optimization.",
        nextAction: "Discuss reserve balance and liquidity preferences.",
        status: "Opportunity identified"
      }
    ],
    nextBestAction: {
      title: "Set wealth planning review",
      priority: "High",
      reason: "Long-tenured, tier 3 client with large savings and invested balances.",
      banker: "Iris Bennett",
      due: "06/12/2026"
    },
    alerts: [
      { label: "High savings balance", type: "Opportunity" },
      { label: "HELOC review available", type: "Lending" },
      { label: "Wealth advisor assigned", type: "Relationship" }
    ],
    notes: [
      { author: "Iris Bennett", date: "05/15/2026", text: "Client prefers in-branch appointments for financial reviews." },
      { author: "Branch Teller", date: "05/12/2026", text: "No service issues reported during last visit." }
    ],
    loans: [
      { type: "Home Equity Line", balance: 43600, status: "Current", paymentStatus: "Interest due 06/18/2026" }
    ]
  },
  {
    accountNumber: "10077403",
    name: "Priya Shah",
    ssn: "000-12-1004",
    cif: "CIF-7740304",
    dob: "01/14/1992",
    zip: "46236",
    relationship: "4 years",
    address: "9008 Fall Creek Rd, Indianapolis, IN 46236",
    phone: "317-555-0174",
    email: "priya.shah@example.com",
    primaryBranch: "Geist",
    personalBanker: "Maya Thompson",
    wealthAdvisor: "Not assigned",
    checking: 3840,
    savings: 12900,
    household: 22140,
    investedBalance: 0,
    affluencyTier: 1,
    profitability: {
      tier: "Low",
      annualContribution: 340,
      mainDriver: "Checking, savings, and card relationship",
      watchItem: "Relationship is still developing"
    },
    businessAccounts: [],
    accounts: [
      { type: "Everyday Checking", account: "10077403", status: "Open", openDate: "05/21/2022", balance: 3840 },
      { type: "Statement Savings", account: "20077403", status: "Open", openDate: "05/21/2022", balance: 12900 },
      { type: "Rewards Credit Card", account: "40077403", status: "Active", openDate: "10/09/2023", balance: 2140 }
    ],
    householdMembers: [
      { name: "Priya Shah", relationship: "Primary", products: "Checking, Savings, Credit Card" }
    ],
    fraudRiskScore: 47,
    fraudRiskTier: "Medium",
    fraudCases: 0,
    frontlineNotes: 2,
    lastReviewed: "05/24/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 2, impact: 15 },
      { type: "Phishing Concern", count: 2, impact: 12 }
    ],
    fraudDrivers: [
      "Two frontline notes",
      "Repeated login verification prompts",
      "No confirmed fraud loss",
      "Lower total relationship exposure"
    ],
    discoverNeeds: [
      {
        product: "Starter Investment Conversation",
        priority: "Medium",
        reason: "Client has no invested balance and could benefit from an introductory investment discussion.",
        nextAction: "Ask about savings goals and time horizon.",
        status: "Needs discovery"
      },
      {
        product: "Credit Card Payment Plan Review",
        priority: "Medium",
        reason: "Credit card balance is active and may need payment-plan support.",
        nextAction: "Review monthly payment comfort and payoff goal.",
        status: "Banker conversation"
      },
      {
        product: "Emergency Savings Goal",
        priority: "Low",
        reason: "Savings balance exists but relationship value is still developing.",
        nextAction: "Set target reserve balance with client.",
        status: "Optional discussion"
      }
    ],
    nextBestAction: {
      title: "Ask about savings goals",
      priority: "Medium",
      reason: "Client has growing savings but no invested balance with the bank.",
      banker: "Maya Thompson",
      due: "06/09/2026"
    },
    alerts: [
      { label: "Starter investment conversation", type: "Opportunity" },
      { label: "Credit card payment due soon", type: "Service" },
      { label: "Two recent frontline notes", type: "Service" }
    ],
    notes: [
      { author: "Maya Thompson", date: "05/26/2026", text: "Client is saving for a home down payment." },
      { author: "Branch Teller", date: "05/24/2026", text: "Client asked about automatic transfers to savings." }
    ],
    loans: [
      { type: "Credit Card", balance: 2140, status: "Active", paymentStatus: "Minimum due 06/04/2026" }
    ]
  },
  {
    accountNumber: "10090866",
    name: "Thomas Nguyen",
    ssn: "000-12-1005",
    cif: "CIF-9086619",
    dob: "09/05/1958",
    zip: "46202",
    relationship: "17 years",
    address: "401 Mass Ave, Indianapolis, IN 46202",
    phone: "317-555-0166",
    email: "thomas.nguyen@example.com",
    primaryBranch: "Mass Ave",
    personalBanker: "Evan Brooks",
    wealthAdvisor: "Leah Sullivan",
    checking: 44210,
    savings: 720400,
    household: 1028430,
    investedBalance: 984220,
    affluencyTier: 3,
    profitability: {
      tier: "High",
      annualContribution: 7850,
      mainDriver: "Private client deposits, CDs, and investment balances",
      watchItem: "Beneficiary and estate review recommended"
    },
    businessAccounts: [
      {
        businessName: "Nguyen Family Holdings LLC",
        role: "Authorized Signer",
        products: "Business Checking, Treasury Services",
        relationshipValue: 318500
      }
    ],
    accounts: [
      { type: "Private Client Checking", account: "10090866", status: "Open", openDate: "11/16/2009", balance: 44210 },
      { type: "Premium Savings", account: "20090866", status: "Open", openDate: "11/16/2009", balance: 720400 },
      { type: "Brokered CD", account: "30090866", status: "Matures 03/2027", openDate: "03/02/2025", balance: 263820 }
    ],
    householdMembers: [
      { name: "Thomas Nguyen", relationship: "Primary", products: "Checking, Savings, CD" },
      { name: "Linh Nguyen", relationship: "Spouse", products: "Joint Savings" }
    ],
    fraudRiskScore: 18,
    fraudRiskTier: "Low",
    fraudCases: 0,
    frontlineNotes: 0,
    lastReviewed: "05/07/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 0, impact: 0 },
      { type: "Phishing Concern", count: 0, impact: 0 }
    ],
    fraudDrivers: [
      "No fraud history",
      "Stable device behavior",
      "Long-standing client",
      "High value client monitored with low alerts"
    ],
    discoverNeeds: [
      {
        product: "Private Client Wealth Review",
        priority: "High",
        reason: "Highest household balance and invested balance among the test clients.",
        nextAction: "Schedule annual wealth review with assigned advisor.",
        status: "Ready for outreach"
      },
      {
        product: "Estate and Beneficiary Review",
        priority: "High",
        reason: "Large relationship value should trigger beneficiary and account titling review.",
        nextAction: "Confirm beneficiaries and joint ownership details.",
        status: "Needs advisor review"
      },
      {
        product: "CD Maturity Strategy",
        priority: "Medium",
        reason: "Brokered CD maturity creates a timely reinvestment conversation.",
        nextAction: "Review CD maturity date and reinvestment options.",
        status: "Opportunity identified"
      }
    ],
    nextBestAction: {
      title: "Complete annual wealth review",
      priority: "High",
      reason: "Private client with highest relationship value and assigned wealth advisor.",
      banker: "Evan Brooks",
      due: "06/14/2026"
    },
    alerts: [
      { label: "CD maturity strategy available", type: "Opportunity" },
      { label: "Beneficiary review recommended", type: "Service" },
      { label: "Private client relationship", type: "Relationship" }
    ],
    notes: [
      { author: "Evan Brooks", date: "05/10/2026", text: "Client prefers quarterly check-ins by phone." },
      { author: "Leah Sullivan", date: "05/07/2026", text: "Discussed CD reinvestment timing and liquidity needs." }
    ],
    loans: []
  },
  {
    accountNumber: "10112679",
    name: "Alicia Moreno",
    ssn: "000-12-1006",
    cif: "CIF-1126795",
    dob: "12/22/1980",
    zip: "46123",
    relationship: "10 years",
    address: "55 E Main St, Avon, IN 46123",
    phone: "317-555-0126",
    email: "alicia.moreno@example.com",
    primaryBranch: "Avon",
    personalBanker: "Sophia Ramirez",
    wealthAdvisor: "Not assigned",
    checking: 9400,
    savings: 26700,
    household: 64100,
    investedBalance: 12500,
    affluencyTier: 1,
    profitability: {
      tier: "Medium",
      annualContribution: 1120,
      mainDriver: "Mortgage, personal loan, and growing deposit relationship",
      watchItem: "High fraud score and service needs"
    },
    businessAccounts: [
      {
        businessName: "Moreno Catering Co.",
        role: "Owner",
        products: "Business Checking",
        relationshipValue: 28400
      }
    ],
    accounts: [
      { type: "Everyday Checking", account: "10112679", status: "Open", openDate: "02/08/2016", balance: 9400 },
      { type: "Statement Savings", account: "20112679", status: "Open", openDate: "02/08/2016", balance: 26700 },
      { type: "Rewards Credit Card", account: "40112679", status: "Active", openDate: "06/18/2019", balance: 6200 }
    ],
    householdMembers: [
      { name: "Alicia Moreno", relationship: "Primary", products: "Checking, Savings, Mortgage" },
      { name: "Diego Moreno", relationship: "Joint Owner", products: "Joint Checking, Personal Loan" }
    ],
    fraudRiskScore: 81,
    fraudRiskTier: "High",
    fraudCases: 3,
    frontlineNotes: 5,
    lastReviewed: "05/30/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 1, impact: 24 },
      { type: "Card Fraud", count: 2, impact: 22 },
      { type: "Suspicious Login", count: 4, impact: 20 },
      { type: "Phishing Concern", count: 3, impact: 12 }
    ],
    fraudDrivers: [
      "Multiple recent fraud cases",
      "Account takeover history",
      "High frontline concern count",
      "Card fraud pattern detected"
    ],
    discoverNeeds: [
      {
        product: "Mortgage Payment Review",
        priority: "High",
        reason: "Mortgage balance is active and payment timing should be reviewed.",
        nextAction: "Review payment schedule and escrow needs.",
        status: "Needs banker review"
      },
      {
        product: "Debt Consolidation Review",
        priority: "Medium",
        reason: "Personal loan and card balance create a possible consolidation conversation.",
        nextAction: "Compare current debt payments and payoff timeline.",
        status: "Lending review"
      },
      {
        product: "Fraud-Safe Digital Banking Setup",
        priority: "High",
        reason: "High fraud matrix score suggests the client may benefit from stronger digital controls.",
        nextAction: "Review alerts, passwords, device access, and contact preferences.",
        status: "Immediate service opportunity"
      }
    ],
    nextBestAction: {
      title: "Review digital safety setup",
      priority: "High",
      reason: "High fraud score and recent fraud history make digital controls a service priority.",
      banker: "Sophia Ramirez",
      due: "06/03/2026"
    },
    alerts: [
      { label: "Fraud matrix score is high", type: "Risk" },
      { label: "Mortgage payment review", type: "Lending" },
      { label: "Digital banking safety review", type: "Service" }
    ],
    notes: [
      { author: "Sophia Ramirez", date: "05/31/2026", text: "Client requested help setting stronger account alerts." },
      { author: "Fraud Team", date: "05/30/2026", text: "Recommend verifying contact preferences before high-risk activity." }
    ],
    loans: [
      { type: "Mortgage", balance: 188900, status: "Current", paymentStatus: "Next due 06/01/2026" },
      { type: "Personal Loan", balance: 6200, status: "Current", paymentStatus: "Next due 06/12/2026" }
    ]
  },
  {
    accountNumber: "10144520",
    name: "Grace Bennett",
    ssn: "000-12-1007",
    cif: "CIF-1445208",
    dob: "04/07/1974",
    zip: "46037",
    relationship: "15 years",
    address: "723 Lantern Rd, Fishers, IN 46037",
    phone: "317-555-0197",
    email: "grace.bennett@example.com",
    primaryBranch: "Fishers",
    personalBanker: "Nora Whitfield",
    wealthAdvisor: "Avery Chen",
    checking: 32860,
    savings: 214750,
    household: 689430,
    investedBalance: 396820,
    affluencyTier: 3,
    profitability: {
      tier: "High",
      annualContribution: 6120,
      mainDriver: "Wealth balances, deposits, mortgage, and business services",
      watchItem: "Review concentration of business deposits"
    },
    businessAccounts: [
      {
        businessName: "Bennett Custom Homes LLC",
        role: "Owner",
        products: "Business Checking, Treasury Services, Business Credit Card",
        relationshipValue: 226400
      }
    ],
    accounts: [
      { type: "Premier Checking", account: "10144520", status: "Open", openDate: "06/14/2011", balance: 32860 },
      { type: "Business Owner Money Market", account: "20144520", status: "Open", openDate: "02/03/2014", balance: 214750 },
      { type: "18 Month CD", account: "30144520", status: "Matures 11/2026", openDate: "05/08/2025", balance: 118400 }
    ],
    householdMembers: [
      { name: "Grace Bennett", relationship: "Primary", products: "Checking, Savings, Mortgage, Business" },
      { name: "Henry Bennett", relationship: "Spouse", products: "Joint Savings, Credit Card" }
    ],
    fraudRiskScore: 31,
    fraudRiskTier: "Low",
    fraudCases: 0,
    frontlineNotes: 1,
    lastReviewed: "05/22/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 1, impact: 8 },
      { type: "Phishing Concern", count: 1, impact: 4 }
    ],
    fraudDrivers: [
      "No confirmed fraud cases",
      "One recent login verification",
      "High-value relationship monitored",
      "Business deposits increase exposure"
    ],
    discoverNeeds: [
      {
        product: "Business Treasury Review",
        priority: "High",
        reason: "Business relationship has strong balances and may benefit from treasury tools.",
        nextAction: "Review cash flow, payroll, and merchant service needs.",
        status: "Ready for outreach"
      },
      {
        product: "Managed Portfolio Check-In",
        priority: "High",
        reason: "Affluency tier 3 client with significant invested balance.",
        nextAction: "Schedule joint banker and wealth advisor meeting.",
        status: "Advisor review"
      },
      {
        product: "CD Renewal Strategy",
        priority: "Medium",
        reason: "CD maturity in late 2026 creates a retention conversation.",
        nextAction: "Discuss liquidity needs before maturity.",
        status: "Opportunity identified"
      }
    ],
    nextBestAction: {
      title: "Coordinate business and wealth review",
      priority: "High",
      reason: "Client has high personal value, invested assets, and a linked business relationship.",
      banker: "Nora Whitfield",
      due: "06/18/2026"
    },
    alerts: [
      { label: "Treasury review available", type: "Business" },
      { label: "Wealth advisor assigned", type: "Relationship" },
      { label: "CD maturity window approaching", type: "Opportunity" }
    ],
    notes: [
      { author: "Nora Whitfield", date: "05/23/2026", text: "Client asked about separating operating cash from reserve balances." },
      { author: "Avery Chen", date: "05/22/2026", text: "Portfolio review due before next business expansion decision." }
    ],
    loans: [
      { type: "Mortgage", balance: 312500, status: "Current", paymentStatus: "Next due 06/17/2026" },
      { type: "Business Term Loan", balance: 72500, status: "Current", paymentStatus: "Next due 06/20/2026" }
    ]
  },
  {
    accountNumber: "10188764",
    name: "Omar Williams",
    ssn: "000-12-1008",
    cif: "CIF-1887642",
    dob: "08/26/1988",
    zip: "46227",
    relationship: "6 years",
    address: "3409 Madison Ave, Indianapolis, IN 46227",
    phone: "317-555-0186",
    email: "omar.williams@example.com",
    primaryBranch: "Southport",
    personalBanker: "Caleb Martin",
    wealthAdvisor: "Not assigned",
    checking: 11620,
    savings: 33650,
    household: 92070,
    investedBalance: 5500,
    affluencyTier: 1,
    profitability: {
      tier: "Medium",
      annualContribution: 1480,
      mainDriver: "Auto loan, deposits, and business checking relationship",
      watchItem: "Seasonal cash-flow swings in the business"
    },
    businessAccounts: [
      {
        businessName: "Williams Auto Repair LLC",
        role: "Owner",
        products: "Business Checking, Equipment Loan",
        relationshipValue: 118900
      }
    ],
    accounts: [
      { type: "Everyday Checking", account: "10188764", status: "Open", openDate: "09/10/2020", balance: 11620 },
      { type: "Statement Savings", account: "20188764", status: "Open", openDate: "09/10/2020", balance: 33650 },
      { type: "Rewards Credit Card", account: "40188764", status: "Active", openDate: "03/19/2022", balance: 4200 }
    ],
    householdMembers: [
      { name: "Omar Williams", relationship: "Primary", products: "Checking, Savings, Auto Loan, Business" },
      { name: "Janelle Williams", relationship: "Joint Owner", products: "Joint Checking" }
    ],
    fraudRiskScore: 43,
    fraudRiskTier: "Medium",
    fraudCases: 0,
    frontlineNotes: 2,
    lastReviewed: "05/27/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 2, impact: 14 },
      { type: "Phishing Concern", count: 1, impact: 8 }
    ],
    fraudDrivers: [
      "Business debit card replacement request",
      "Two recent frontline notes",
      "Moderate digital activity change",
      "No confirmed fraud loss"
    ],
    discoverNeeds: [
      {
        product: "Business Equipment Refinance",
        priority: "High",
        reason: "Business has equipment financing that may qualify for a refinance conversation.",
        nextAction: "Review remaining equipment loan term and current payment.",
        status: "Needs lending review"
      },
      {
        product: "Cash Reserve Sweep",
        priority: "Medium",
        reason: "Savings balance could support a dedicated reserve strategy.",
        nextAction: "Ask about business seasonality and reserve target.",
        status: "Banker conversation"
      },
      {
        product: "Business Credit Card Review",
        priority: "Low",
        reason: "Owner uses personal rewards card and may need cleaner business expense separation.",
        nextAction: "Compare monthly business spend categories.",
        status: "Optional discussion"
      }
    ],
    nextBestAction: {
      title: "Review business equipment financing",
      priority: "High",
      reason: "Linked business account has an equipment loan and possible refinance need.",
      banker: "Caleb Martin",
      due: "06/16/2026"
    },
    alerts: [
      { label: "Business equipment refinance", type: "Lending" },
      { label: "Seasonal cash-flow review", type: "Business" },
      { label: "Recent debit card replacement", type: "Service" }
    ],
    notes: [
      { author: "Caleb Martin", date: "05/28/2026", text: "Client mentioned replacing shop diagnostic equipment this summer." },
      { author: "Branch Teller", date: "05/27/2026", text: "Verified business debit card replacement request in branch." }
    ],
    loans: [
      { type: "Auto Loan", balance: 18400, status: "Current", paymentStatus: "Next due 06/14/2026" },
      { type: "Equipment Loan", balance: 48600, status: "Current", paymentStatus: "Next due 06/19/2026" }
    ]
  },
  {
    accountNumber: "10233018",
    name: "Mei Lin Carter",
    ssn: "000-12-1009",
    cif: "CIF-2330186",
    dob: "02/11/1995",
    zip: "46205",
    relationship: "2 years",
    address: "1522 N College Ave, Indianapolis, IN 46205",
    phone: "317-555-0138",
    email: "mei.carter@example.com",
    primaryBranch: "Fall Creek",
    personalBanker: "Maya Thompson",
    wealthAdvisor: "Not assigned",
    checking: 7200,
    savings: 54800,
    household: 69100,
    investedBalance: 7100,
    affluencyTier: 2,
    profitability: {
      tier: "Medium",
      annualContribution: 980,
      mainDriver: "Growing deposits and new business owner relationship",
      watchItem: "Newer relationship still needs product fit discovery"
    },
    businessAccounts: [
      {
        businessName: "Carter Tech Consulting LLC",
        role: "Owner",
        products: "Business Checking, Business Debit Card",
        relationshipValue: 64000
      }
    ],
    accounts: [
      { type: "Everyday Checking", account: "10233018", status: "Open", openDate: "08/03/2024", balance: 7200 },
      { type: "High Yield Savings", account: "20233018", status: "Open", openDate: "08/03/2024", balance: 54800 },
      { type: "Rewards Credit Card", account: "40233018", status: "Active", openDate: "01/12/2025", balance: 1800 }
    ],
    householdMembers: [
      { name: "Mei Lin Carter", relationship: "Primary", products: "Checking, Savings, Business" }
    ],
    fraudRiskScore: 36,
    fraudRiskTier: "Low",
    fraudCases: 0,
    frontlineNotes: 1,
    lastReviewed: "05/20/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 0, impact: 0 },
      { type: "Suspicious Login", count: 1, impact: 8 },
      { type: "Phishing Concern", count: 1, impact: 5 }
    ],
    fraudDrivers: [
      "New business relationship",
      "One phishing education note",
      "No confirmed fraud cases",
      "Lower loan exposure"
    ],
    discoverNeeds: [
      {
        product: "Business Credit Card",
        priority: "Medium",
        reason: "Business debit usage suggests a card could help separate expenses and build history.",
        nextAction: "Ask about monthly consulting expenses.",
        status: "Needs discovery"
      },
      {
        product: "Starter Wealth Conversation",
        priority: "Medium",
        reason: "Savings balance is growing and invested balance is still light.",
        nextAction: "Discuss goals, emergency reserve, and time horizon.",
        status: "Banker conversation"
      },
      {
        product: "Tax Reserve Account",
        priority: "Low",
        reason: "Consulting income may benefit from a separate tax reserve account.",
        nextAction: "Ask about quarterly tax planning.",
        status: "Optional discussion"
      }
    ],
    nextBestAction: {
      title: "Discover business banking needs",
      priority: "Medium",
      reason: "New business owner relationship with growing deposits and likely payment needs.",
      banker: "Maya Thompson",
      due: "06/21/2026"
    },
    alerts: [
      { label: "New business owner relationship", type: "Business" },
      { label: "Starter wealth opportunity", type: "Opportunity" },
      { label: "Phishing education completed", type: "Service" }
    ],
    notes: [
      { author: "Maya Thompson", date: "05/21/2026", text: "Client asked how to separate consulting income from personal savings." },
      { author: "Contact Center", date: "05/20/2026", text: "Sent phishing education checklist after suspicious email question." }
    ],
    loans: [
      { type: "Personal Loan", balance: 5200, status: "Current", paymentStatus: "Next due 06/25/2026" }
    ]
  },
  {
    accountNumber: "10277455",
    name: "Robert Hayes",
    ssn: "000-12-1010",
    cif: "CIF-2774550",
    dob: "10/03/1951",
    zip: "46142",
    relationship: "29 years",
    address: "804 Madison Ave, Greenwood, IN 46142",
    phone: "317-555-0155",
    email: "robert.hayes@example.com",
    primaryBranch: "Greenwood",
    personalBanker: "Sophia Ramirez",
    wealthAdvisor: "Victor Hale",
    checking: 15890,
    savings: 128600,
    household: 244380,
    investedBalance: 54890,
    affluencyTier: 2,
    profitability: {
      tier: "High",
      annualContribution: 2210,
      mainDriver: "Long-tenured deposits, CD balances, and business relationship",
      watchItem: "Higher fraud vulnerability due to recent phone scam attempt"
    },
    businessAccounts: [
      {
        businessName: "Hayes Family Farm Market",
        role: "Owner",
        products: "Business Checking, Seasonal Line of Credit",
        relationshipValue: 173200
      }
    ],
    accounts: [
      { type: "Classic Checking", account: "10277455", status: "Open", openDate: "05/18/1997", balance: 15890 },
      { type: "Premium Savings", account: "20277455", status: "Open", openDate: "05/18/1997", balance: 128600 },
      { type: "24 Month CD", account: "30277455", status: "Matures 01/2027", openDate: "01/22/2025", balance: 45200 }
    ],
    householdMembers: [
      { name: "Robert Hayes", relationship: "Primary", products: "Checking, Savings, CD, Business" },
      { name: "Linda Hayes", relationship: "Spouse", products: "Joint Checking, CD" }
    ],
    fraudRiskScore: 68,
    fraudRiskTier: "Medium",
    fraudCases: 1,
    frontlineNotes: 4,
    lastReviewed: "05/31/2026",
    fraudHistory: [
      { type: "Account Takeover", count: 0, impact: 0 },
      { type: "Card Fraud", count: 1, impact: 18 },
      { type: "Suspicious Login", count: 2, impact: 15 },
      { type: "Phishing Concern", count: 4, impact: 18 }
    ],
    fraudDrivers: [
      "Recent phone scam attempt",
      "Multiple frontline education notes",
      "Card replacement after suspected compromise",
      "Long-tenured client with high deposit balances"
    ],
    discoverNeeds: [
      {
        product: "Fraud-Safe Service Review",
        priority: "High",
        reason: "Recent scam attempt and frontline notes suggest the client may need stronger safeguards.",
        nextAction: "Review verbal passwords, alerts, trusted contacts, and digital access.",
        status: "Immediate service opportunity"
      },
      {
        product: "CD Ladder Strategy",
        priority: "Medium",
        reason: "CD maturity and high savings balance create a renewal planning opportunity.",
        nextAction: "Discuss income needs and maturity timing.",
        status: "Opportunity identified"
      },
      {
        product: "Seasonal Business Line Review",
        priority: "Medium",
        reason: "Farm market has seasonal working capital needs.",
        nextAction: "Review upcoming inventory and cash-flow timing.",
        status: "Needs lending review"
      }
    ],
    nextBestAction: {
      title: "Complete fraud-safe service review",
      priority: "High",
      reason: "Client had a recent scam attempt and would benefit from stronger account safeguards.",
      banker: "Sophia Ramirez",
      due: "06/11/2026"
    },
    alerts: [
      { label: "Fraud-safe service review", type: "Risk" },
      { label: "CD maturity strategy", type: "Opportunity" },
      { label: "Seasonal business line review", type: "Lending" }
    ],
    notes: [
      { author: "Sophia Ramirez", date: "06/01/2026", text: "Client reported a suspicious phone call claiming to be from the bank." },
      { author: "Branch Teller", date: "05/31/2026", text: "Reviewed scam warning signs and confirmed contact preferences." }
    ],
    loans: [
      { type: "Seasonal Business Line", balance: 38000, status: "Current", paymentStatus: "Interest due 06/28/2026" }
    ]
  }
];

window.crmSearchConfig = {
  accountNumber: {
    methodLabel: "Account Number Search",
    formTitle: "Enter account number",
    inputLabel: "Account number",
    hint: "Try test account number 10024588.",
    example: "10024588",
    sqlField: "account_number",
    displayName: "Account Number"
  },
  name: {
    methodLabel: "Name Search",
    formTitle: "Enter customer name",
    inputLabel: "Customer name",
    hint: "Try Elise Parker, Grace Bennett, Omar Williams, or Mei Lin Carter.",
    example: "Elise Parker",
    sqlField: "customer_name",
    displayName: "Name"
  },
  ssn: {
    methodLabel: "SSN Search",
    formTitle: "Enter SSN",
    inputLabel: "SSN",
    hint: "Prototype uses fake test SSNs only. Try 000-12-1001.",
    example: "000-12-1001",
    sqlField: "ssn",
    displayName: "SSN"
  },
  cif: {
    methodLabel: "Customer ID Search",
    formTitle: "Enter Customer ID (CIF)",
    inputLabel: "Customer ID (CIF)",
    hint: "Try test CIF CIF-8842391.",
    example: "CIF-8842391",
    sqlField: "cif",
    displayName: "Customer ID (CIF)"
  }
};

window.crmFindCustomer = function crmFindCustomer(type, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return window.crmCustomers.find((customer) => {
    const fieldValue = String(customer[type] || "").toLowerCase();
    return type === "name" ? fieldValue.includes(normalizedValue) : fieldValue === normalizedValue;
  });
};

window.crmFindEmployee = function crmFindEmployee(type, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  const fieldMap = {
    employeeName: "name",
    employeeEmail: "email"
  };
  const fieldName = fieldMap[type] || type;

  return window.crmEmployees.find((employee) => {
    const fieldValue = String(employee[fieldName] || "").toLowerCase();
    return ["employeeName", "department"].includes(type) ? fieldValue.includes(normalizedValue) : fieldValue === normalizedValue;
  });
};

window.crmFindBusiness = function crmFindBusiness(type, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return window.crmBusinessRecords.find((business) => {
    const fieldValue = String(business[type] || "").toLowerCase();
    return type === "businessName" ? fieldValue.includes(normalizedValue) : fieldValue === normalizedValue;
  });
};

window.crmFindSegment = function crmFindSegment(type, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return window.crmMarketingSegments.find((segment) => {
    return segment.name.toLowerCase().includes(normalizedValue)
      || segment.signal.toLowerCase().includes(normalizedValue);
  });
};

window.crmFindOffer = function crmFindOffer(type, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  return window.crmOffers.find((offer) => {
    return offer.title.toLowerCase().includes(normalizedValue)
      || offer.status.toLowerCase().includes(normalizedValue);
  });
};

window.crmIsWealthClient = function crmIsWealthClient(customer) {
  return Boolean(customer && (customer.affluencyTier >= 3 || customer.investedBalance >= 100000));
};

window.crmFindLookupRecord = function crmFindLookupRecord(target, type, value) {
  if (target === "employee") {
    return window.crmFindEmployee(type, value);
  }

  if (target === "business") {
    return window.crmFindBusiness(type, value);
  }

  if (target === "segment") {
    return window.crmFindSegment(type, value);
  }

  if (target === "offer") {
    return window.crmFindOffer(type, value);
  }

  const customer = window.crmFindCustomer(type, value);

  if (target === "wealth") {
    return window.crmIsWealthClient(customer) ? customer : null;
  }

  if (target === "loanCustomer") {
    return customer && customer.loans.length > 0 ? customer : null;
  }

  return customer;
};

window.crmFormatCurrency = function crmFormatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
};

window.crmMaskSsn = function crmMaskSsn(ssn) {
  return `***-**-${String(ssn).slice(-4)}`;
};

window.crmRoleProfiles = {
  admin: {
    label: "Admin",
    department: "Administration",
    name: "Morgan Lee",
    firstName: "Morgan",
    email: "admin.crm.demo@gmail.com",
    page: "home.html?role=admin",
    dashboardFocus: "Full oversight across relationship growth, access, profitability, fraud risk, and CRM adoption.",
    primaryPurpose: "Govern the CRM, manage access, and review the health of customer-facing workflows.",
    shouldAccess: [
      "All role dashboards and access controls",
      "Client profile summaries, profitability, leads, offers, fraud summary, and loan pipeline",
      "Role adoption, test user activity, and prototype configuration"
    ],
    shouldNotAccess: [
      "No unrestricted changes to customer records without approval",
      "No production credentials or real customer authentication data",
      "No direct employee HR files beyond role/access administration"
    ],
    permissions: [
      "View all prototype modules",
      "Review access by department",
      "Monitor profitability, fraud, lending, and campaign workflows"
    ],
    snapshot: [
      { label: "CRM Users", metric: "roleCount", help: "Active test roles" },
      { label: "Customers", metric: "customerCount", help: "Prototype customer records" },
      { label: "Annual Profitability", metric: "annualContribution", format: "currency", help: "Estimated contribution" },
      { label: "High Risk Clients", metric: "highRiskCount", help: "Fraud score 60+" }
    ],
    workQueue: [
      { title: "Review role access matrix", status: "Admin", detail: "Confirm each department sees the correct CRM data." },
      { title: "Monitor high-risk customer workflow", status: "Oversight", detail: "Fraud team has investigation access while bankers see service alerts." },
      { title: "Profitability rollout review", status: "Leadership", detail: "Use relationship contribution to support coaching and account planning." }
    ],
    actions: [
      { label: "Open Client Lookup", href: "index.html", detail: "Search by account, name, SSN, or CIF." },
      { label: "View High-Risk Client", href: "fraud.html?accountNumber=10112679", detail: "Open Alicia Moreno fraud matrix details." },
      { label: "Open Discover Needs", href: "discover.html?accountNumber=10024588", detail: "Review product fit workflow." }
    ]
  },
  hr: {
    label: "HR",
    department: "Human Resources",
    name: "Camille Brown",
    firstName: "Camille",
    email: "hr.crm.demo@gmail.com",
    page: "home.html?role=hr",
    dashboardFocus: "Employee readiness, training, access reviews, and consistent CRM usage.",
    primaryPurpose: "Manage employee-related CRM readiness and internal role access, not customer financial servicing.",
    shouldAccess: [
      "Employee training tasks and CRM adoption prompts",
      "Role access requests and permission summaries",
      "Internal coaching notes at an aggregated level"
    ],
    shouldNotAccess: [
      "Customer financial balances, SSNs, and full client profiles",
      "Fraud investigation details and transaction history",
      "Marketing segmentation tied to individual customer records"
    ],
    permissions: [
      "View training and access readiness",
      "Review role-based usage at a summary level",
      "Escalate incorrect access requests"
    ],
    snapshot: [
      { label: "Test Users", metric: "roleCount", help: "Active demo accounts" },
      { label: "Training Items", metric: "hrTaskCount", help: "Open readiness tasks" },
      { label: "Access Reviews", metric: "accessReviewCount", help: "Pending approvals" },
      { label: "Restricted Customer Data", value: "Hidden", help: "Financial data blocked" }
    ],
    workQueue: [
      { title: "Banker CRM coaching", status: "In progress", detail: "Review consistent notes and opportunity documentation." },
      { title: "Fraud access recertification", status: "Pending", detail: "Confirm only fraud team users can open deep investigation details." },
      { title: "Loans role onboarding", status: "New", detail: "Train lending team on PL/BL lead handling." }
    ],
    actions: [
      { label: "Review Role Directory", href: "home.html", detail: "See all role dashboards." },
      { label: "Return to Login", href: "login.html", detail: "Switch to another demo account." }
    ]
  },
  banker: {
    label: "Banker",
    department: "Retail Banking",
    name: "Nora Whitfield",
    firstName: "Nora",
    email: "banker.crm.demo@gmail.com",
    page: "home.html?role=banker",
    dashboardFocus: "Client profiles, relationship growth, alerts, profitability, and next best actions.",
    primaryPurpose: "Manage relationships, grow accounts, serve clients, and coordinate follow-up.",
    shouldAccess: [
      "Client profile, balances, loans, contact history, opportunities, alerts, and profitability",
      "Fraud score summary for service awareness",
      "Discover Needs product recommendations",
      "Household and business relationship summaries"
    ],
    shouldNotAccess: [
      "Deep fraud investigation evidence and transaction forensics",
      "Internal HR data",
      "System configuration and access-control tooling"
    ],
    permissions: [
      "Open client profiles",
      "View fraud score summary only",
      "Work PL and BL opportunities",
      "Add service notes and review alerts"
    ],
    snapshot: [
      { label: "Customers", metric: "customerCount", help: "Book of business" },
      { label: "Open Leads", metric: "bankerLeadCount", help: "Visible PL/BL leads" },
      { label: "Meetings", metric: "bankerMeetingCount", help: "Upcoming engagement" },
      { label: "Profitability", metric: "annualContribution", format: "currency", help: "Relationship contribution" }
    ],
    workQueue: [
      { title: "Schedule wealth consultation", status: "High priority", detail: "Elise Parker has tier 3 affluency and an assigned wealth advisor.", href: "discover.html?accountNumber=10024588" },
      { title: "Business lending discovery", status: "Ready", detail: "Dana Collins has a linked commercial relationship.", href: "client.html?type=accountNumber&value=10058217" },
      { title: "Review digital safety setup", status: "Service", detail: "Alicia Moreno has high fraud risk and needs careful handling.", href: "client.html?type=accountNumber&value=10112679" }
    ],
    actions: [
      { label: "Open Client Lookup", href: "index.html", detail: "Search for any test customer." },
      { label: "Open Elise Parker", href: "client.html?type=accountNumber&value=10024588", detail: "High-value relationship example." },
      { label: "Discover Needs", href: "discover.html?accountNumber=10031942", detail: "Product-fit recommendations." }
    ]
  },
  wealth: {
    label: "Wealth",
    department: "Wealth Management",
    name: "Avery Chen",
    firstName: "Avery",
    email: "wealth.crm.demo@gmail.com",
    page: "home.html?role=wealth",
    dashboardFocus: "High-net-worth client management, investment portfolios, asset allocation, and wealth relationship growth.",
    primaryPurpose: "Manage affluent clients, investment relationships, portfolio reviews, and wealth planning conversations.",
    shouldAccess: [
      "Wealth clients only",
      "Full account data for assigned affluent relationships",
      "Investment portfolio, invested balance, asset allocation, and wealth advisor notes",
      "Fraud score summary for risk awareness"
    ],
    shouldNotAccess: [
      "Fraud investigation detail",
      "Employee records",
      "Marketing campaign management",
      "System audit logs"
    ],
    permissions: [
      "Search wealth clients only",
      "Open Wealth Client Profile",
      "Review investment portfolio data",
      "View fraud score summary only"
    ],
    snapshot: [
      { label: "Wealth Clients", metric: "wealthClientCount", help: "Affluency tier 3" },
      { label: "Invested Assets", metric: "investedAssets", help: "Prototype AUM" },
      { label: "Portfolio Reviews", value: "3", help: "Ready for outreach" },
      { label: "Fraud Score", metric: "averageFraudScore", help: "Summary only" }
    ],
    workQueue: [
      { title: "Annual wealth review", status: "High", detail: "Thomas Nguyen has the largest invested balance in the prototype.", href: "wealth.html?accountNumber=10090866" },
      { title: "Portfolio allocation review", status: "Ready", detail: "Elise Parker has tier 3 affluency and a high fraud score summary.", href: "wealth.html?accountNumber=10024588" },
      { title: "Business owner wealth planning", status: "Opportunity", detail: "Dana Collins has high deposits and a linked business relationship.", href: "wealth.html?accountNumber=10058217" }
    ],
    actions: [
      { label: "Open Wealth Lookup", href: "index.html", detail: "Search affluent client and portfolio records." },
      { label: "Open Thomas Nguyen", href: "wealth.html?accountNumber=10090866", detail: "Private client portfolio example." },
      { label: "Open Elise Parker", href: "wealth.html?accountNumber=10024588", detail: "High-value relationship example." }
    ]
  },
  fraud: {
    label: "Fraud",
    department: "Fraud Team",
    name: "Jordan Blake",
    firstName: "Jordan",
    email: "fraud.crm.demo@gmail.com",
    page: "home.html?role=fraud",
    dashboardFocus: "Fraud matrix, disputes, risk scoring, alerts, and investigation workflow.",
    primaryPurpose: "Detect and prevent fraud while protecting the bank and customers from account compromise.",
    shouldAccess: [
      "Full fraud matrix and risk scoring",
      "Fraud cases, disputes, alerts, and frontline suspicious activity notes",
      "Aggregated risk segments in read-only form",
      "Links into deeper investigation workflows"
    ],
    shouldNotAccess: [
      "Individual customer balances outside the fraud workflow",
      "Marketing campaign targeting details",
      "Wealth planning recommendations unrelated to fraud risk",
      "HR employee records"
    ],
    permissions: [
      "Open fraud matrix details",
      "Review high-risk customers",
      "Use frontline notes in risk assessment"
    ],
    snapshot: [
      { label: "High Risk Clients", metric: "highRiskCount", help: "Score 60+" },
      { label: "Fraud Cases", metric: "fraudCaseCount", help: "Historical cases" },
      { label: "Frontline Notes", metric: "frontlineNoteCount", help: "Observation count" },
      { label: "Avg Fraud Score", metric: "averageFraudScore", help: "Across test cases" }
    ],
    workQueue: [
      { title: "Investigate Alicia Moreno", status: "Critical", detail: "Score 81 / 100 with multiple recent fraud cases.", href: "fraud.html?accountNumber=10112679" },
      { title: "Review Elise Parker", status: "High", detail: "Score 72 / 100 with prior account takeover activity.", href: "fraud.html?accountNumber=10024588" },
      { title: "Monitor Priya Shah", status: "Medium", detail: "Repeated login verification prompts and frontline notes.", href: "fraud.html?accountNumber=10077403" }
    ],
    actions: [
      { label: "Open Alicia Fraud Matrix", href: "fraud.html?accountNumber=10112679", detail: "Detailed fraud graph and score drivers." },
      { label: "Open Elise Fraud Matrix", href: "fraud.html?accountNumber=10024588", detail: "Prior account takeover case." },
      { label: "Client Lookup", href: "index.html", detail: "Find a customer before investigation." }
    ]
  },
  loans: {
    label: "Loans",
    department: "Loans and Mortgage",
    name: "Taylor Brooks",
    firstName: "Taylor",
    email: "loans.crm.demo@gmail.com",
    page: "home.html?role=loans",
    dashboardFocus: "PL/BL leads, mortgage opportunities, refinancing, credit review, and lending follow-up.",
    primaryPurpose: "Underwrite and sell lending products while coordinating with bankers on qualified opportunities.",
    shouldAccess: [
      "Credit and loan product data needed for lending conversations",
      "Personal loan, business loan, mortgage, and refinance opportunities",
      "Income and eligibility notes where appropriate for underwriting"
    ],
    shouldNotAccess: [
      "Fraud investigation case details beyond high-level risk flags",
      "Marketing segmentation lists unrelated to lending",
      "Internal HR or IT data"
    ],
    permissions: [
      "View PL and BL lead pipeline",
      "Review active loan balances and refinance opportunities",
      "Coordinate lending next steps with bankers"
    ],
    snapshot: [
      { label: "PL Leads", metric: "plLeadCount", help: "Personal lending" },
      { label: "BL Leads", metric: "blLeadCount", help: "Business lending" },
      { label: "Loan Balance", metric: "loanBalance", format: "currency", help: "Active loans" },
      { label: "Refi Reviews", value: "3", help: "Prototype opportunities" }
    ],
    workQueue: [
      { title: "Personal loan refinance", status: "High", detail: "Marcus Reed may benefit from a payment or rate review.", href: "client.html?type=accountNumber&value=10031942" },
      { title: "Debt consolidation review", status: "Medium", detail: "Alicia Moreno has card and personal loan exposure.", href: "client.html?type=accountNumber&value=10112679" },
      { title: "Business line of credit", status: "High", detail: "Collins Properties LLC may need flexible working capital.", href: "client.html?type=accountNumber&value=10058217" }
    ],
    actions: [
      { label: "Open Client Lookup", href: "index.html", detail: "Search lending customers." },
      { label: "Open Marcus Reed", href: "client.html?type=accountNumber&value=10031942", detail: "Personal loan refinance example." },
      { label: "Open Dana Collins", href: "client.html?type=accountNumber&value=10058217", detail: "Business lending example." }
    ]
  },
  marketing: {
    label: "Marketing",
    department: "Marketing",
    name: "Riley Patel",
    firstName: "Riley",
    email: "marketing.crm.demo@gmail.com",
    page: "home.html?role=marketing",
    dashboardFocus: "Aggregated customer segments, product usage trends, and campaign-ready opportunity signals.",
    primaryPurpose: "Run campaigns and target customers without exposing sensitive individual financial or fraud details.",
    shouldAccess: [
      "Customer segments and product usage trends",
      "Aggregated opportunity signals for PL and BL campaigns",
      "Campaign status, offer audience, and product fit categories"
    ],
    shouldNotAccess: [
      "SSN and full account details",
      "Full fraud investigation details",
      "Individual customer transaction history"
    ],
    permissions: [
      "View campaign-ready offers",
      "Use aggregated product trends",
      "Coordinate outreach with bankers"
    ],
    snapshot: [
      { label: "Campaign Offers", metric: "offerCount", help: "PL/BL campaign ideas" },
      { label: "Segments", metric: "segmentCount", help: "Aggregated groups" },
      { label: "PL Audience", value: "3 clients", help: "Pre-screen group" },
      { label: "BL Audience", value: "4 links", help: "Business relationship group" }
    ],
    workQueue: [
      { title: "Business loan owner outreach", status: "Campaign ready", detail: "Use linked business accounts to identify working capital needs." },
      { title: "Personal loan pre-screen", status: "Draft", detail: "Targets customers with consumer debt and clean payment history." },
      { title: "High-yield savings campaign", status: "Planning", detail: "Aggregate savings balances into a product education campaign." }
    ],
    actions: [
      { label: "View CRM Home", href: "home.html", detail: "Compare role access inside the same CRM home." },
      { label: "Return to Login", href: "login.html", detail: "Switch demo accounts." }
    ]
  }
};

window.crmRoleApiPermissions = {
  admin: [
    "view_dashboard",
    "view_roles",
    "view_leads",
    "view_all_leads",
    "view_offers",
    "view_all_offers",
    "view_meetings",
    "view_all_meetings",
    "view_fraud_summary",
    "view_fraud_detail",
    "view_pipeline",
    "view_profitability",
    "view_activity",
    "view_discover_needs",
    "search_customers",
    "search_businesses",
    "search_employees",
    "search_fraud_risk",
    "search_wealth_customers",
    "search_loan_customers",
    "search_segments",
    "search_offers",
    "manage_leads",
    "manage_bank_notes",
    "manage_meetings",
    "edit_leads",
    "edit_bank_notes",
    "edit_meetings",
    "edit_customers",
    "edit_offers",
    "edit_businesses",
    "edit_employees"
  ],
  hr: [
    "view_dashboard",
    "view_roles",
    "search_employees",
    "search_employee_businesses",
    "edit_employees"
  ],
  banker: [
    "view_dashboard",
    "view_roles",
    "view_leads",
    "view_meetings",
    "view_fraud_summary",
    "view_pipeline",
    "view_profitability",
    "view_discover_needs",
    "search_customers",
    "search_businesses",
    "manage_leads",
    "manage_bank_notes",
    "manage_meetings",
    "edit_leads",
    "edit_bank_notes",
    "edit_meetings",
    "edit_customers",
    "edit_businesses"
  ],
  wealth: [
    "view_dashboard",
    "view_roles",
    "view_offers",
    "view_all_offers",
    "view_meetings",
    "view_fraud_summary",
    "view_pipeline",
    "view_profitability",
    "search_wealth_customers",
    "manage_bank_notes",
    "manage_meetings",
    "edit_bank_notes",
    "edit_meetings",
    "edit_customers"
  ],
  fraud: [
    "view_dashboard",
    "view_roles",
    "view_fraud_summary",
    "view_fraud_detail",
    "search_fraud_risk",
    "search_segments"
  ],
  loans: [
    "view_dashboard",
    "view_roles",
    "view_leads",
    "view_meetings",
    "view_fraud_summary",
    "view_pipeline",
    "search_loan_customers",
    "search_businesses",
    "manage_leads",
    "manage_bank_notes",
    "manage_meetings",
    "edit_leads",
    "edit_bank_notes",
    "edit_meetings",
    "edit_customers",
    "edit_businesses"
  ],
  marketing: [
    "view_dashboard",
    "view_roles",
    "view_offers",
    "view_pipeline",
    "search_segments",
    "search_offers",
    "edit_offers"
  ]
};

window.crmModulePermissions = {
  home: "view_dashboard",
  lookup: "view_dashboard",
  leads: "view_leads",
  offers: "view_offers",
  fraud: "view_fraud_summary",
  meetings: "view_meetings",
  pipeline: "view_pipeline",
  profitability: "view_profitability",
  activity: "view_activity",
  roles: "view_roles"
};

window.crmPagePermissions = {
  leads: "view_leads",
  leadDetail: "view_leads",
  offers: "view_offers",
  offerDetail: "view_offers",
  fraudWatch: "view_fraud_summary",
  meetings: "view_meetings",
  meetingDetail: "view_meetings",
  pipeline: "view_pipeline",
  profitability: "view_profitability",
  activity: "view_activity"
};

window.crmLoginUsers = Object.entries(window.crmRoleProfiles).map(([role, profile]) => ({
  role,
  label: profile.label,
  name: profile.name,
  email: profile.email,
  page: profile.page
}));

window.crmLeads = [
  {
    type: "PL",
    title: "Personal loan refinance",
    accountNumber: "10031942",
    amount: 9800,
    priority: "High",
    status: "Banker follow-up",
    reason: "Marcus Reed may benefit from a payment or rate review on an existing personal loan.",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  },
  {
    type: "PL",
    title: "Debt consolidation review",
    accountNumber: "10112679",
    amount: 12400,
    priority: "Medium",
    status: "Needs lending review",
    reason: "Alicia Moreno has card and personal loan exposure that could become one cleaner payment.",
    visibleTo: ["admin", "banker", "loans"]
  },
  {
    type: "BL",
    title: "Business line of credit",
    accountNumber: "10058217",
    amount: 65000,
    priority: "High",
    status: "Ready for outreach",
    reason: "Collins Properties LLC has a business relationship and may need flexible working capital.",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  },
  {
    type: "BL",
    title: "Equipment loan discussion",
    accountNumber: "10112679",
    amount: 28000,
    priority: "Medium",
    status: "Discovery needed",
    reason: "Moreno Catering Co. has a small business relationship that could support growth financing.",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  },
  {
    type: "PL",
    title: "Home equity conversation",
    accountNumber: "10024588",
    amount: 45000,
    priority: "Low",
    status: "Optional discussion",
    reason: "Elise Parker has strong home and deposit relationship value for a future lending conversation.",
    visibleTo: ["admin", "banker", "loans"]
  },
  {
    type: "BL",
    title: "Treasury services review",
    accountNumber: "10144520",
    amount: 85000,
    priority: "High",
    status: "Ready for outreach",
    reason: "Bennett Custom Homes LLC has strong balances and may benefit from treasury services.",
    visibleTo: ["admin", "banker", "loans", "wealth", "marketing"]
  },
  {
    type: "BL",
    title: "Equipment refinance review",
    accountNumber: "10188764",
    amount: 48600,
    priority: "High",
    status: "Needs lending review",
    reason: "Williams Auto Repair LLC has equipment financing that may qualify for a refinance review.",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  },
  {
    type: "PL",
    title: "Starter investment conversation",
    accountNumber: "10233018",
    amount: 15000,
    priority: "Medium",
    status: "Banker conversation",
    reason: "Mei Lin Carter has growing savings and limited invested balance with the bank.",
    visibleTo: ["admin", "banker", "wealth"]
  },
  {
    type: "BL",
    title: "Seasonal line review",
    accountNumber: "10277455",
    amount: 38000,
    priority: "Medium",
    status: "Lending review",
    reason: "Hayes Family Farm Market may need seasonal working capital planning before peak inventory.",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  }
];

window.crmOffers = [
  {
    type: "PL",
    title: "Personal loan pre-screen campaign",
    audience: "3 clients",
    priority: "Medium",
    status: "Draft offer",
    reason: "Targets customers with active consumer debt and clean payment history.",
    visibleTo: ["admin", "marketing", "banker", "loans"]
  },
  {
    type: "BL",
    title: "Business loan owner outreach",
    audience: "8 business links",
    priority: "High",
    status: "Campaign ready",
    reason: "Uses linked business accounts to identify customers who may need working capital.",
    visibleTo: ["admin", "marketing", "banker", "loans"]
  },
  {
    type: "BL",
    title: "Business services growth campaign",
    audience: "5 business clients",
    priority: "High",
    status: "Planning",
    reason: "Targets business relationships with deposit value, lending opportunities, and treasury service signals.",
    visibleTo: ["admin", "marketing", "banker", "loans"]
  },
  {
    type: "PL",
    title: "Digital safety referral prompt",
    audience: "Branch cue",
    priority: "Low",
    status: "Service prompt",
    reason: "Gives frontline teams simple language to refer a customer to a banker or fraud specialist.",
    visibleTo: ["admin", "hr", "fraud"]
  }
];

window.crmMeetings = [
  {
    title: "Wealth consultation",
    accountNumber: "10024588",
    client: "Elise Parker",
    date: "06/07/2026",
    owner: "Nora Whitfield",
    visibleTo: ["admin", "banker"]
  },
  {
    title: "Business lending discovery",
    accountNumber: "10058217",
    client: "Dana Collins",
    date: "06/10/2026",
    owner: "Iris Bennett",
    visibleTo: ["admin", "banker", "loans", "marketing"]
  },
  {
    title: "Fraud-safe digital banking setup",
    accountNumber: "10112679",
    client: "Alicia Moreno",
    date: "06/03/2026",
    owner: "Sophia Ramirez",
    visibleTo: ["admin", "banker", "fraud", "hr"]
  },
  {
    title: "Treasury and wealth review",
    accountNumber: "10144520",
    client: "Grace Bennett",
    date: "06/18/2026",
    owner: "Nora Whitfield",
    visibleTo: ["admin", "banker", "wealth", "loans"]
  },
  {
    title: "Business equipment refinance",
    accountNumber: "10188764",
    client: "Omar Williams",
    date: "06/16/2026",
    owner: "Caleb Martin",
    visibleTo: ["admin", "banker", "loans"]
  },
  {
    title: "Fraud-safe service review",
    accountNumber: "10277455",
    client: "Robert Hayes",
    date: "06/11/2026",
    owner: "Sophia Ramirez",
    visibleTo: ["admin", "banker", "fraud"]
  }
];

window.crmMarketingSegments = [
  { name: "High savings, no investment relationship", audience: "3 clients", signal: "Starter wealth education" },
  { name: "Linked business owners", audience: "8 relationships", signal: "BL working-capital campaign" },
  { name: "Consumer debt optimization", audience: "5 clients", signal: "PL refinance campaign" },
  { name: "CD maturity window", audience: "4 clients", signal: "Retention and renewal outreach" },
  { name: "Business services growth", audience: "5 business clients", signal: "Treasury and lending campaign" }
];

window.crmHrTasks = [
  { title: "Banker note consistency coaching", status: "Open", owner: "Camille Brown" },
  { title: "Fraud dashboard access recertification", status: "Pending", owner: "Camille Brown" },
  { title: "Loans role onboarding checklist", status: "New", owner: "Camille Brown" },
  { title: "Marketing privacy training", status: "Scheduled", owner: "Camille Brown" }
];

window.crmEmployees = [
  {
    employeeId: "EMP-1001",
    name: "Camille Brown",
    email: "hr.crm.demo@gmail.com",
    department: "Human Resources",
    role: "HR Business Partner",
    branch: "Corporate Office",
    manager: "Morgan Lee",
    accessLevel: "Employee records and access readiness",
    status: "Active",
    hireDate: "08/14/2019",
    trainingStatus: "Current",
    disclosures: "No outside business relationship on file",
    linkedBusinessId: ""
  },
  {
    employeeId: "EMP-1002",
    name: "Nora Whitfield",
    email: "banker.crm.demo@gmail.com",
    department: "Retail Banking",
    role: "Personal Banker",
    branch: "Indianapolis Downtown",
    manager: "Iris Bennett",
    accessLevel: "Client profile and relationship management",
    status: "Active",
    hireDate: "02/03/2017",
    trainingStatus: "CRM notes coaching due",
    disclosures: "No outside business relationship on file",
    linkedBusinessId: ""
  },
  {
    employeeId: "EMP-1003",
    name: "Jordan Blake",
    email: "fraud.crm.demo@gmail.com",
    department: "Fraud Team",
    role: "Fraud Analyst",
    branch: "Operations Center",
    manager: "Morgan Lee",
    accessLevel: "Fraud matrix and case investigation",
    status: "Active",
    hireDate: "11/09/2020",
    trainingStatus: "Fraud access recertification pending",
    disclosures: "No outside business relationship on file",
    linkedBusinessId: ""
  },
  {
    employeeId: "EMP-1004",
    name: "Taylor Brooks",
    email: "loans.crm.demo@gmail.com",
    department: "Loans and Mortgage",
    role: "Loan Specialist",
    branch: "Carmel",
    manager: "Victor Hale",
    accessLevel: "Lending pipeline and loan review",
    status: "Active",
    hireDate: "04/18/2021",
    trainingStatus: "Lending role onboarding current",
    disclosures: "Outside business account disclosed",
    linkedBusinessId: "BUS-9005"
  },
  {
    employeeId: "EMP-1005",
    name: "Riley Patel",
    email: "marketing.crm.demo@gmail.com",
    department: "Marketing",
    role: "Campaign Manager",
    branch: "Corporate Office",
    manager: "Morgan Lee",
    accessLevel: "Aggregated campaign and segment data",
    status: "Active",
    hireDate: "06/22/2022",
    trainingStatus: "Privacy training scheduled",
    disclosures: "No outside business relationship on file",
    linkedBusinessId: ""
  },
  {
    employeeId: "EMP-1006",
    name: "Avery Chen",
    email: "wealth.crm.demo@gmail.com",
    department: "Wealth Management",
    role: "Wealth Advisor",
    branch: "Indianapolis Downtown",
    manager: "Morgan Lee",
    accessLevel: "Wealth client profile and investment portfolio",
    status: "Active",
    hireDate: "09/12/2018",
    trainingStatus: "Current",
    disclosures: "No outside business relationship on file",
    linkedBusinessId: ""
  },
  {
    employeeId: "EMP-1007",
    name: "Evan Brooks",
    email: "evan.brooks@example.com",
    department: "Retail Banking",
    role: "Relationship Banker",
    branch: "Mass Ave",
    manager: "Nora Whitfield",
    accessLevel: "Client profile and notes",
    status: "Active",
    hireDate: "01/17/2018",
    trainingStatus: "Current",
    disclosures: "Employee also has a personal customer relationship",
    linkedBusinessId: ""
  }
];

window.crmBusinessRecords = [
  {
    businessId: "BUS-9001",
    businessName: "Parker Design Studio LLC",
    ownerName: "Elise Parker",
    ownerType: "Customer",
    linkedAccountNumber: "10024588",
    products: "Business Checking, Merchant Services, Business Credit Card",
    relationshipValue: 86400,
    status: "Active",
    banker: "Nora Whitfield",
    lendingOpportunity: "Merchant services expansion"
  },
  {
    businessId: "BUS-9002",
    businessName: "Collins Properties LLC",
    ownerName: "Dana Collins",
    ownerType: "Customer",
    linkedAccountNumber: "10058217",
    products: "Business Checking, Line of Credit",
    relationshipValue: 142800,
    status: "Active",
    banker: "Iris Bennett",
    lendingOpportunity: "Business line of credit review"
  },
  {
    businessId: "BUS-9003",
    businessName: "Nguyen Family Holdings LLC",
    ownerName: "Thomas Nguyen",
    ownerType: "Customer",
    linkedAccountNumber: "10090866",
    products: "Business Checking, Treasury Services",
    relationshipValue: 318500,
    status: "Active",
    banker: "Evan Brooks",
    lendingOpportunity: "Treasury services review"
  },
  {
    businessId: "BUS-9004",
    businessName: "Moreno Catering Co.",
    ownerName: "Alicia Moreno",
    ownerType: "Customer",
    linkedAccountNumber: "10112679",
    products: "Business Checking",
    relationshipValue: 28400,
    status: "Active",
    banker: "Sophia Ramirez",
    lendingOpportunity: "Equipment loan discussion"
  },
  {
    businessId: "BUS-9005",
    businessName: "Brooks Home Services LLC",
    ownerName: "Taylor Brooks",
    ownerType: "Employee",
    linkedEmployeeId: "EMP-1004",
    products: "Business Checking",
    relationshipValue: 18600,
    status: "Disclosed employee relationship",
    banker: "Caleb Martin",
    lendingOpportunity: "Disclosure review only for HR"
  },
  {
    businessId: "BUS-9006",
    businessName: "Bennett Custom Homes LLC",
    ownerName: "Grace Bennett",
    ownerType: "Customer",
    linkedAccountNumber: "10144520",
    products: "Business Checking, Treasury Services, Business Credit Card",
    relationshipValue: 226400,
    status: "Active",
    banker: "Nora Whitfield",
    lendingOpportunity: "Treasury services and expansion financing"
  },
  {
    businessId: "BUS-9007",
    businessName: "Williams Auto Repair LLC",
    ownerName: "Omar Williams",
    ownerType: "Customer",
    linkedAccountNumber: "10188764",
    products: "Business Checking, Equipment Loan",
    relationshipValue: 118900,
    status: "Active",
    banker: "Caleb Martin",
    lendingOpportunity: "Equipment refinance review"
  },
  {
    businessId: "BUS-9008",
    businessName: "Carter Tech Consulting LLC",
    ownerName: "Mei Lin Carter",
    ownerType: "Customer",
    linkedAccountNumber: "10233018",
    products: "Business Checking, Business Debit Card",
    relationshipValue: 64000,
    status: "Active",
    banker: "Maya Thompson",
    lendingOpportunity: "Business credit card conversation"
  },
  {
    businessId: "BUS-9009",
    businessName: "Hayes Family Farm Market",
    ownerName: "Robert Hayes",
    ownerType: "Customer",
    linkedAccountNumber: "10277455",
    products: "Business Checking, Seasonal Line of Credit",
    relationshipValue: 173200,
    status: "Active",
    banker: "Sophia Ramirez",
    lendingOpportunity: "Seasonal working capital review"
  },
  {
    businessId: "BUS-9010",
    businessName: "Circle City Dental Group",
    ownerName: "Dr. Hannah Price",
    ownerType: "Business",
    linkedAccountNumber: "",
    products: "Business Checking, Payroll Services, Term Loan",
    relationshipValue: 412000,
    status: "Active standalone business client",
    banker: "Iris Bennett",
    lendingOpportunity: "Expansion loan prequalification"
  }
];

window.crmLookupProfiles = {
  admin: {
    eyebrow: "CRM Lookup",
    title: "What record do you need to find?",
    note: "Admin can search customer, business, fraud, employee, segment, and wealth records.",
    noAccessMessage: "",
    methods: [
      { key: "accountNumber", target: "customer", label: "Customer", methodLabel: "Customer Account Search", formTitle: "Enter customer account number", inputLabel: "Account number", hint: "Try customer account 10024588.", example: "10024588" },
      { key: "businessId", target: "business", label: "Business", methodLabel: "Business Search", formTitle: "Enter business ID", inputLabel: "Business ID", hint: "Try business ID BUS-9010.", example: "BUS-9010" },
      { key: "name", target: "wealth", label: "Wealth Client", methodLabel: "Wealth Client Search", formTitle: "Enter wealth client name", inputLabel: "Wealth client", hint: "Try Thomas Nguyen, Elise Parker, or Dana Collins.", example: "Thomas Nguyen" },
      { key: "name", target: "fraud", label: "Fraud Risk", methodLabel: "Fraud Risk Search", formTitle: "Enter fraud risk customer", inputLabel: "Customer name", hint: "Try Alicia Moreno.", example: "Alicia Moreno" },
      { key: "employeeId", target: "employee", label: "Employee", methodLabel: "Employee Search", formTitle: "Enter employee ID", inputLabel: "Employee ID", hint: "Try employee ID EMP-1004.", example: "EMP-1004" },
      { key: "segmentName", target: "segment", label: "Segments", methodLabel: "Segment Search", formTitle: "Enter segment", inputLabel: "Segment", hint: "Try Linked business owners.", example: "Linked business owners" }
    ]
  },
  banker: {
    eyebrow: "Client Lookup",
    title: "How would you like to search?",
    note: "Bankers can search customer relationships and linked business accounts.",
    noAccessMessage: "",
    methods: [
      { key: "accountNumber", target: "customer", label: "Account Number", methodLabel: "Account Number Search", formTitle: "Enter account number", inputLabel: "Account number", hint: "Try test account number 10024588.", example: "10024588" },
      { key: "name", target: "customer", label: "Name", methodLabel: "Name Search", formTitle: "Enter customer name", inputLabel: "Customer name", hint: "Try Elise Parker, Grace Bennett, Omar Williams, or Mei Lin Carter.", example: "Grace Bennett" },
      { key: "cif", target: "customer", label: "Customer ID (CIF)", methodLabel: "Customer ID Search", formTitle: "Enter Customer ID (CIF)", inputLabel: "Customer ID (CIF)", hint: "Try test CIF CIF-8842391.", example: "CIF-8842391" },
      { key: "businessName", target: "business", label: "Business Name", methodLabel: "Business Name Search", formTitle: "Enter business name", inputLabel: "Business name", hint: "Try Circle City Dental Group or Williams Auto Repair LLC.", example: "Circle City Dental Group" }
    ]
  },
  wealth: {
    eyebrow: "Wealth Lookup",
    title: "Find a wealth client or portfolio",
    note: "Wealth can search affluent clients, wealth portfolios, and investment accounts only.",
    noAccessMessage: "",
    methods: [
      { key: "name", target: "wealth", label: "Wealth Client", methodLabel: "Wealth Client Search", formTitle: "Enter wealth client name", inputLabel: "Wealth client", hint: "Try Thomas Nguyen, Elise Parker, or Dana Collins.", example: "Thomas Nguyen" },
      { key: "accountNumber", target: "wealth", label: "Customer Account", methodLabel: "Wealth Account Search", formTitle: "Enter wealth customer account", inputLabel: "Account number", hint: "Try wealth account 10090866.", example: "10090866" },
      { key: "cif", target: "wealth", label: "Portfolio CIF", methodLabel: "Portfolio Search", formTitle: "Enter Customer ID (CIF)", inputLabel: "Customer ID (CIF)", hint: "Try CIF-9086619.", example: "CIF-9086619" },
      { key: "name", target: "wealth", label: "Investment Accounts", methodLabel: "Investment Search", formTitle: "Enter investment client", inputLabel: "Investment client", hint: "Try Elise Parker.", example: "Elise Parker" }
    ]
  },
  fraud: {
    eyebrow: "Fraud Lookup",
    title: "Find a fraud risk record",
    note: "Fraud can search fraud risk records and aggregate segments. Results open fraud details, not full customer profiles.",
    noAccessMessage: "",
    methods: [
      { key: "accountNumber", target: "fraud", label: "Account Number", methodLabel: "Fraud Account Search", formTitle: "Enter account number", inputLabel: "Account number", hint: "Try high-risk account 10112679.", example: "10112679" },
      { key: "name", target: "fraud", label: "Name", methodLabel: "Fraud Name Search", formTitle: "Enter customer name", inputLabel: "Customer name", hint: "Try Alicia Moreno or Elise Parker.", example: "Alicia Moreno" },
      { key: "cif", target: "fraud", label: "Customer ID (CIF)", methodLabel: "Fraud CIF Search", formTitle: "Enter Customer ID (CIF)", inputLabel: "Customer ID (CIF)", hint: "Try CIF-1126795.", example: "CIF-1126795" },
      { key: "segmentName", target: "segment", label: "Segments", methodLabel: "Segment Search", formTitle: "Enter risk segment", inputLabel: "Segment", hint: "Try Consumer debt optimization.", example: "Consumer debt optimization" }
    ]
  },
  loans: {
    eyebrow: "Lending Lookup",
    title: "Find a loan relationship",
    note: "Loans can search loan applications and customers limited to the lending portfolio.",
    noAccessMessage: "",
    methods: [
      { key: "accountNumber", target: "loanCustomer", label: "Loan Application", methodLabel: "Loan Application Search", formTitle: "Enter loan customer account", inputLabel: "Account number", hint: "Try Marcus Reed account 10031942.", example: "10031942" },
      { key: "name", target: "loanCustomer", label: "Loan Customer", methodLabel: "Loan Customer Search", formTitle: "Enter loan customer name", inputLabel: "Customer name", hint: "Try Marcus Reed or Alicia Moreno.", example: "Marcus Reed" },
      { key: "businessId", target: "business", label: "Business Loan", methodLabel: "Business Lending Search", formTitle: "Enter business ID", inputLabel: "Business ID", hint: "Try BUS-9002.", example: "BUS-9002" },
      { key: "accountNumber", target: "loanCustomer", label: "Credit/Fraud Score", methodLabel: "Credit and Fraud Score Search", formTitle: "Enter lending account", inputLabel: "Account number", hint: "Try Alicia Moreno account 10112679.", example: "10112679" }
    ]
  },
  marketing: {
    eyebrow: "Marketing View",
    title: "Search segments and offers",
    note: "Marketing can search campaign and offer data only. Individual customer lookup is blocked.",
    noAccessMessage: "",
    methods: [
      { key: "segmentName", target: "segment", label: "Segments", methodLabel: "Segment Search", formTitle: "Enter segment", inputLabel: "Segment", hint: "Try Linked business owners.", example: "Linked business owners" },
      { key: "offerTitle", target: "offer", label: "Offers", methodLabel: "Offer Search", formTitle: "Enter offer", inputLabel: "Offer", hint: "Try Business loan owner outreach.", example: "Business loan owner outreach" },
      { key: "segmentName", target: "segment", label: "Campaign", methodLabel: "Campaign Search", formTitle: "Enter campaign signal", inputLabel: "Campaign signal", hint: "Try Personal loan pre-screen.", example: "Personal loan pre-screen" },
      { key: "offerTitle", target: "offer", label: "Offer Status", methodLabel: "Offer Status Search", formTitle: "Enter offer status", inputLabel: "Offer status", hint: "Try Campaign ready.", example: "Campaign ready" }
    ]
  },
  hr: {
    eyebrow: "Employee Account Lookup",
    title: "Find an employee account",
    note: "HR can search employee records only. Customer financial lookup is blocked.",
    noAccessMessage: "",
    methods: [
      { key: "employeeId", target: "employee", label: "Employee ID", methodLabel: "Employee ID Search", formTitle: "Enter employee ID", inputLabel: "Employee ID", hint: "Try employee ID EMP-1004.", example: "EMP-1004" },
      { key: "employeeName", target: "employee", label: "Employee Name", methodLabel: "Employee Name Search", formTitle: "Enter employee name", inputLabel: "Employee name", hint: "Try Taylor Brooks or Camille Brown.", example: "Taylor Brooks" },
      { key: "employeeEmail", target: "employee", label: "Employee Email", methodLabel: "Employee Email Search", formTitle: "Enter employee email", inputLabel: "Employee email", hint: "Try loans.crm.demo@gmail.com.", example: "loans.crm.demo@gmail.com" },
      { key: "department", target: "employee", label: "Department", methodLabel: "Department Search", formTitle: "Enter department", inputLabel: "Department", hint: "Try Loans and Mortgage or Fraud Team.", example: "Loans and Mortgage" }
    ]
  }
};

window.crmNormalizeRole = function crmNormalizeRole(role) {
  return window.crmRoleProfiles[role] ? role : "admin";
};

window.crmSetActiveRole = function crmSetActiveRole(role) {
  localStorage.setItem("crmActiveRole", window.crmNormalizeRole(role));
};

window.crmGetActiveRole = function crmGetActiveRole() {
  return window.crmNormalizeRole(localStorage.getItem("crmActiveRole") || "admin");
};

window.crmSetActiveUser = function crmSetActiveUser(user) {
  localStorage.setItem("crmActiveUser", JSON.stringify({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    page: user.page,
    permissions: user.permissions || []
  }));
  window.crmSetActiveRole(user.role);
};

window.crmGetActiveUser = function crmGetActiveUser() {
  try {
    return JSON.parse(localStorage.getItem("crmActiveUser")) || null;
  } catch (error) {
    return null;
  }
};

window.crmGetPermissions = function crmGetPermissions() {
  const user = window.crmGetActiveUser();

  if (user && Array.isArray(user.permissions) && user.permissions.length) {
    return user.permissions;
  }

  return window.crmRoleApiPermissions[window.crmGetActiveRole()] || [];
};

window.crmHasPermission = function crmHasPermission(permission) {
  return window.crmGetPermissions().includes(permission);
};

window.crmHasAnyPermission = function crmHasAnyPermission(permissions) {
  return [].concat(permissions || []).some((permission) => window.crmHasPermission(permission));
};

window.crmCanAccessModule = function crmCanAccessModule(moduleName) {
  const requiredPermission = window.crmModulePermissions[moduleName];
  return !requiredPermission || window.crmHasPermission(requiredPermission);
};

window.crmCanAccessPage = function crmCanAccessPage(pageName) {
  const requiredPermission = window.crmPagePermissions[pageName];
  return !requiredPermission || window.crmHasPermission(requiredPermission);
};

window.crmSetSession = function crmSetSession(session) {
  localStorage.setItem("crmSessionToken", session.token);
  window.crmSetActiveUser({
    ...session.user,
    permissions: session.permissions || []
  });
};

window.crmGetSessionToken = function crmGetSessionToken() {
  return localStorage.getItem("crmSessionToken") || "";
};

window.crmClearSession = function crmClearSession() {
  localStorage.removeItem("crmSessionToken");
  localStorage.removeItem("crmActiveUser");
};

window.crmClientUrl = function crmClientUrl(accountNumber) {
  return `client.html?type=accountNumber&value=${encodeURIComponent(accountNumber)}`;
};
