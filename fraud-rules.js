(function attachFraudRules() {
  const RULES = [
    {
      category: "Government or bank impersonation scam",
      tag: "threat_or_safe_account",
      label: "Safe-account or threat script",
      confidence: "Very High",
      scoreLift: 24,
      phrases: [
        "move my money to protect it",
        "move money to a safe account",
        "bank account is compromised",
        "foreign hacker is in my account",
        "under investigation",
        "will be arrested",
        "money is at risk",
        "funds are at risk",
        "move money immediately"
      ],
      why: "Threats and safe-account instructions are strong impersonation and phantom-hacker indicators.",
      action: "Pause the transaction, separate the customer from outside coaching, and escalate to Fraud before funds move."
    },
    {
      category: "Tech support or phantom hacker scam",
      tag: "remote_access_or_secure_funds",
      label: "Remote access or coached transfer",
      confidence: "Very High",
      scoreLift: 26,
      phrases: [
        "remote access",
        "download remote software",
        "log in to my bank while they watched",
        "stay on the phone while",
        "federal reserve will protect",
        "should not tell the bank",
        "do not tell the bank",
        "support needs remote access"
      ],
      why: "Remote access plus coached money movement is one of the highest-risk support fraud patterns.",
      action: "Stop digital banking activity, review device exposure, and route to Fraud for account protection steps."
    },
    {
      category: "Crypto ATM or QR code scam",
      tag: "crypto_kiosk_payment",
      label: "Crypto kiosk / QR payment",
      confidence: "Very High",
      scoreLift: 24,
      phrases: [
        "bitcoin atm",
        "crypto atm",
        "qr code",
        "walked me through the machine",
        "deposit cash into the kiosk",
        "use large bills",
        "send crypto",
        "withdraw cash first"
      ],
      why: "Scammers often coach victims through crypto kiosks or QR codes while funds become hard to recover.",
      action: "Warn the customer, delay the transaction if possible, and document payment route details for Fraud."
    },
    {
      category: "Family emergency scam",
      tag: "urgent_secret_payment",
      label: "Urgent secret payment",
      confidence: "Very High",
      scoreLift: 20,
      phrases: [
        "keep it secret",
        "do not tell",
        "wire the money right away",
        "buy gift cards immediately",
        "someone will pick up cash",
        "only one who can help",
        "bail money",
        "grandson",
        "car accident"
      ],
      why: "Urgency, secrecy, and hard-to-reverse payment methods are common emergency scam mechanics.",
      action: "Slow the interaction down and encourage independent verification with a known family contact."
    },
    {
      category: "Romance / confidence scam",
      tag: "online_only_relationship",
      label: "Online-only relationship",
      confidence: "Medium",
      scoreLift: 6,
      phrases: [
        "met someone online",
        "new boyfriend online",
        "new girlfriend online",
        "moved to whatsapp",
        "moved to telegram",
        "talk every day",
        "they say we are in love"
      ],
      why: "Online-only relationships can become romance scams when paired with urgency or money movement.",
      action: "Ask neutral discovery questions and look for payment requests, new payees, or secrecy."
    },
    {
      category: "Romance led crypto investment scam",
      tag: "romance_crypto_offer",
      label: "Romance crypto investment",
      confidence: "Very High",
      scoreLift: 22,
      phrases: [
        "boyfriend wants to teach me crypto",
        "girlfriend wants to teach me crypto",
        "showed me a crypto platform",
        "guaranteed returns",
        "showed me profits",
        "pay fees to withdraw",
        "act fast on this investment"
      ],
      why: "Romance and fake investment platforms are often combined to create high-confidence fraud pressure.",
      action: "Escalate before any investment transfer and capture platform, payee, and communication details."
    },
    {
      category: "Recovery / refund scam",
      tag: "recovery_fee_or_info",
      label: "Refund or recovery fee",
      confidence: "Very High",
      scoreLift: 22,
      phrases: [
        "recover the money i lost",
        "refund is waiting",
        "processing fee first",
        "administrative fee first",
        "retainer fee first",
        "taxes before releasing",
        "refund department",
        "bank account to deposit the refund",
        "social security number for the refund"
      ],
      why: "Recovery scammers target prior victims and often ask for upfront fees or sensitive data.",
      action: "Treat as high risk, verify independently, and warn that legitimate recovery does not require upfront payment."
    },
    {
      category: "Fake fraud alert or bank alert scam",
      tag: "verify_purchase_or_move_money",
      label: "Fake fraud alert / bank alert",
      confidence: "High",
      scoreLift: 16,
      phrases: [
        "reply yes or no",
        "verify a purchase",
        "suspicious activity on my account",
        "big purchase i did not make",
        "number to call the bank",
        "claiming to be from the bank",
        "bank text alert",
        "text alerts can prevent fraud"
      ],
      why: "Fake fraud alerts can lead customers to call imposters and move funds under pressure.",
      action: "Confirm the contact path, use bank-owned phone numbers only, and review recent profile changes."
    },
    {
      category: "Package delivery or phishing scam",
      tag: "delivery_problem_link",
      label: "Phishing link / delivery problem",
      confidence: "High",
      scoreLift: 12,
      phrases: [
        "missed delivery",
        "unpaid postage",
        "package will be returned",
        "click a link",
        "update shipping preferences",
        "enter my card information"
      ],
      why: "Delivery texts and links are common phishing entry points for card and credential compromise.",
      action: "Review recent card activity, reset exposed credentials if needed, and educate on link safety."
    },
    {
      category: "Business email compromise or vendor fraud",
      tag: "invoice_or_vendor_change",
      label: "Invoice / vendor payment change",
      confidence: "High",
      scoreLift: 16,
      phrases: [
        "vendor changed their wire instructions",
        "email address looked almost right",
        "invoice said past due",
        "invoice looked real",
        "pay a different account",
        "different account number"
      ],
      why: "Vendor payment changes and look-alike emails are common business email compromise indicators.",
      action: "Require out-of-band vendor verification using a known contact before releasing funds."
    },
    {
      category: "Elder financial exploitation or trusted person abuse",
      tag: "trusted_person_control",
      label: "Trusted person control",
      confidence: "High",
      scoreLift: 14,
      phrases: [
        "caregiver handles all",
        "neighbor helps me move money",
        "friend told me to withdraw cash",
        "helper comes with me",
        "not to talk to my family",
        "someone else explained the transaction"
      ],
      why: "Third-party control or isolation can indicate exploitation, especially when paired with withdrawals.",
      action: "Escalate for vulnerable-customer review and document who is coaching or accompanying the customer."
    },
    {
      category: "Investment scam",
      tag: "guaranteed_returns",
      label: "Guaranteed return investment",
      confidence: "High",
      scoreLift: 14,
      phrases: [
        "returns are guaranteed",
        "little or no risk",
        "make money quickly",
        "proven system",
        "secret strategy",
        "offer ends"
      ],
      why: "Guaranteed, fast, low-risk investment language is a repeated scam signal.",
      action: "Review investment source and recommend independent verification before any transfer."
    },
    {
      category: "Account takeover / digital risk",
      tag: "account_takeover_context",
      label: "Account takeover context",
      confidence: "High",
      scoreLift: 12,
      phrases: [
        "account takeover",
        "suspicious login",
        "new device",
        "profile change",
        "payment app request",
        "unexpected payment app"
      ],
      why: "Account takeover context increases risk when paired with customer confusion or new money movement.",
      action: "Review authentication, recent profile changes, new payees, and digital access history."
    },
    {
      category: "Account Takeover via Phone Compromise",
      tag: "phone_takeover_or_sim_swap",
      label: "SIM swap / phone takeover",
      confidence: "Very High",
      scoreLift: 18,
      phrases: [
        "lost my phone and changed my number",
        "my phone suddenly had no service",
        "carrier said my sim was changed",
        "phone number was ported without permission",
        "received a sim change notification",
        "got a two factor code i did not request",
        "authentication codes stopped coming to my phone",
        "new device logged in after phone change",
        "carrier account password was changed",
        "someone tried to move my phone number"
      ],
      why: "Phone-number takeover can let criminals intercept security codes and reset banking credentials.",
      action: "Verify the customer using known contact methods, review profile changes, and check for new payees or unusual transfers."
    },
    {
      category: "Healthcare or Insurance Fraud",
      tag: "healthcare_fraud_or_medical_urgency",
      label: "Healthcare payment urgency",
      confidence: "High",
      scoreLift: 14,
      phrases: [
        "doctor said i need to pay for treatment immediately",
        "hospital billing called and demanded payment today",
        "insurance company said coverage will be cancelled today",
        "medicare called asking for my bank account",
        "medicaid needs a payment before benefits continue",
        "pharmacy said i must pay the copay by wire",
        "medical test results require a payment first",
        "telehealth provider asked for gift cards",
        "treatment will be delayed if i do not send money",
        "health app asked me to verify my bank information"
      ],
      why: "Healthcare urgency can pressure customers into fast payments or credential sharing before independent verification.",
      action: "Ask the customer to verify with the provider using a known phone number and avoid wire, gift card, or crypto payment methods."
    },
    {
      category: "Fake Cryptocurrency Exchange or Platform",
      tag: "crypto_exchange_impersonation",
      label: "Fake crypto exchange",
      confidence: "Very High",
      scoreLift: 24,
      phrases: [
        "downloaded an app that looked like coinbase",
        "website looked exactly like kraken",
        "binance support told me to deposit more",
        "wallet address was sent by the exchange agent",
        "profits show in the app but i cannot withdraw",
        "need to pay a verification fee to withdraw crypto",
        "exchange emailed me a new wallet address",
        "crypto platform asked for taxes before release",
        "learning platform said to send funds to their wallet",
        "app shows guaranteed crypto returns"
      ],
      why: "Fake crypto platforms show false balances and trap customers with fees, taxes, or new deposits before withdrawal.",
      action: "Stop the transfer, verify the platform independently, and capture wallet, website, app, and contact details for Fraud."
    }
  ];

  const DERISKING_PHRASES = [
    "verified legitimate",
    "confirmed with known vendor",
    "family verified",
    "invoice matched prior record",
    "customer confirmed no transfer",
    "false alarm",
    "customer identity verified",
    "banker confirmed legitimate",
    "called the vendor directly",
    "verified using known phone number",
    "payee confirmed by prior record",
    "identity document reviewed",
    "transaction authorization confirmed",
    "known trusted payee",
    "legitimate business confirmed",
    "third party verification completed"
  ];

  window.crmFraudRuleLibrary = RULES;
  window.crmAnalyzeFraudText = analyzeFraudText;
  window.crmAnalyzeFraudSignals = analyzeFraudSignals;
  window.crmFraudRiskTier = getRiskTier;

  // CONCEPT layer (broadened static matching).
  // The phrase rules above require precise multi-word phrases ("bitcoin atm").
  // These concept groups add single-word / alias / stem triggers so a bare
  // mention like "bitcoin", "BTC", or "crypto" also fires. Each concept points
  // at an existing rule by tag and inherits its category, scoreLift, and label,
  // so a concept hit and a phrase hit for the same tag dedupe to one match
  // (higher lift wins). Word/alias matching, not understanding -- a fully
  // paraphrased note with no trigger words still needs the server-side AI layer.
  const CONCEPT_RULES = [
    { reinforces: "crypto_kiosk_payment", triggers: ["bitcoin", "btc", "crypto", "cryptocurrency", "ethereum", "eth", "usdt", "stablecoin", "coinbase", "binance", "kraken", "blockchain", "cold wallet", "crypto wallet", "digital currency", "digital wallet"] },
    { reinforces: "guaranteed_returns", triggers: ["investment", "invest", "investing", "guaranteed return", "guaranteed returns", "double your money", "high return", "passive income", "trading platform", "forex", "day trading"] },
    { reinforces: "crypto_exchange_impersonation", triggers: ["fake exchange", "withdrawal fee", "verification fee", "cant withdraw", "cannot withdraw", "unable to withdraw", "release fee", "unlock my funds"] },
    { reinforces: "threat_or_safe_account", triggers: ["safe account", "government grant", "irs", "social security", "arrest warrant", "legal action", "gift card", "gift cards"] },
    { reinforces: "remote_access_or_secure_funds", triggers: ["anydesk", "teamviewer", "remote access", "remote control", "screen share", "secure my funds"] },
    { reinforces: "recovery_fee_or_info", triggers: ["recovery", "recover my funds", "get my money back", "refund", "overpayment", "compensation fund"] },
    { reinforces: "invoice_or_vendor_change", triggers: ["wire transfer", "wire the funds", "change of bank details", "updated banking details", "new account number", "ach change"] },
    { reinforces: "online_only_relationship", triggers: ["met online", "dating app", "online boyfriend", "online girlfriend", "never met in person", "long distance relationship"] }
  ];

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function matchesConcept(text, trigger) {
    const normalizedText = normalizeText(text);
    const normalizedTrigger = normalizeText(trigger);
    if (!normalizedTrigger) {
      return false;
    }
    if (normalizedTrigger.includes(" ")) {
      return normalizedText.includes(normalizedTrigger);
    }
    const pattern = new RegExp("(^|\\s)" + escapeRegExp(normalizedTrigger) + "(s|es|ing|ed)?(\\s|$)");
    return pattern.test(normalizedText);
  }

  function findConceptMatches(text) {
    const matches = [];
    CONCEPT_RULES.forEach((concept) => {
      const hit = concept.triggers.find((trigger) => matchesConcept(text, trigger));
      if (!hit) {
        return;
      }
      const rule = RULES.find((r) => r.tag === concept.reinforces);
      if (!rule) {
        return;
      }
      matches.push({ ...rule, matchedPhrase: hit, detectedBy: "concept" });
    });
    return matches;
  }

  function analyzeFraudText(text) {
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
      return [];
    }

    return RULES.flatMap((rule) => {
      const phrase = rule.phrases.find((candidate) => normalizedText.includes(normalizeText(candidate)));

      if (!phrase) {
        return [];
      }

      return [{
        ...rule,
        matchedPhrase: phrase
      }];
    });
  }

  function analyzeFraudSignals(customer) {
    const sources = getAnalysisSources(customer);
    const matchesByTag = new Map();
    let deriskingLift = 0;

    sources.forEach((source) => {
      const text = source.text || "";
      const textMatches = analyzeFraudText(text);

      if (hasDeriskingSignal(text)) {
        deriskingLift -= 8;
      }

      textMatches.forEach((match) => {
        const existing = matchesByTag.get(match.tag);
        const candidate = {
          ...match,
          sourceLabel: source.label,
          sourceText: text
        };

        if (!existing || candidate.scoreLift > existing.scoreLift) {
          matchesByTag.set(match.tag, candidate);
        }
      });

      // Concept layer: single-word / alias triggers reinforcing a rule even
      // when its precise phrases are absent (e.g. bare "bitcoin" -> crypto rule).
      findConceptMatches(text).forEach((match) => {
        const existing = matchesByTag.get(match.tag);
        const candidate = {
          ...match,
          sourceLabel: source.label,
          sourceText: text
        };

        if (!existing || candidate.scoreLift > existing.scoreLift) {
          matchesByTag.set(match.tag, candidate);
        }
      });
    });

    const matches = Array.from(matchesByTag.values())
      .sort((a, b) => b.scoreLift - a.scoreLift)
      .slice(0, 5);
    const rawLift = matches.reduce((total, match) => total + match.scoreLift, 0) + deriskingLift;
    const contextualLift = 0;
    const totalLift = Math.max(-10, Math.min(36, rawLift));
    const baseScore = Number(customer?.fraudRiskScore || 0);
    const adjustedScore = Math.max(0, Math.min(100, baseScore + totalLift));
    const topMatch = matches[0] || null;

    return {
      baseScore,
      adjustedScore,
      scoreLift: totalLift,
      contextualLift,
      deriskingLift,
      tier: getRiskTier(adjustedScore),
      topCategory: topMatch ? topMatch.category : "No phrase-family match",
      summary: topMatch
        ? `${topMatch.label} detected from ${topMatch.sourceLabel}.`
        : "No high-confidence scam language detected in active fraud notes.",
      action: topMatch ? topMatch.action : "Continue standard monitoring or add fraud notes if new scam language appears.",
      matches
    };
  }

  function getAnalysisSources(customer) {
    return (customer?.fraudNotes || []).map((note) => ({
      label: `Fraud note by ${note.author || "Unknown"}`,
      text: note.text || ""
    }));
  }

  function hasDeriskingSignal(text) {
    const normalizedText = normalizeText(text);
    return DERISKING_PHRASES.some((phrase) => normalizedText.includes(normalizeText(phrase)));
  }

  function getRiskTier(score) {
    if (score >= 81) return "Critical";
    if (score >= 61) return "High";
    if (score >= 31) return "Medium";
    return "Low";
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
})();
