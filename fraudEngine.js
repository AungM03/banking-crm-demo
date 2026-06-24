(function attachFraudEngine(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    root.crmFraudEngine = api;
    return;
  }

  root.crmFraudEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createFraudEngine() {
  const FRAUD_TEXT_RULES = [
    {
      name: "safe_account_or_threat_script",
      category: "Government or bank impersonation scam",
      description: "Detects threats, false investigations, or instructions to move money to a safe account.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Threats and safe-account instructions are strong impersonation and phantom-hacker indicators.",
      action: "Pause the transaction, separate the customer from outside coaching, and escalate to Fraud before funds move."
    },
    {
      name: "remote_access_or_secure_funds",
      category: "Tech support or phantom hacker scam",
      description: "Detects remote access, coached login, and secrecy around digital banking.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Remote access plus coached money movement is one of the highest-risk support fraud patterns.",
      action: "Stop digital banking activity, review device exposure, and route to Fraud for account protection steps."
    },
    {
      name: "crypto_kiosk_or_qr_payment",
      category: "Crypto ATM or QR code scam",
      description: "Detects crypto kiosk, QR code, and coached cash-to-crypto movement.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Scammers often coach victims through crypto kiosks or QR codes while funds become hard to recover.",
      action: "Warn the customer, delay the transaction if possible, and document payment route details for Fraud."
    },
    {
      name: "urgent_secret_payment",
      category: "Family emergency scam",
      description: "Detects secrecy, urgency, and hard-to-reverse emergency payment patterns.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Urgency, secrecy, and hard-to-reverse payment methods are common emergency scam mechanics.",
      action: "Slow the interaction down and encourage independent verification with a known family contact."
    },
    {
      name: "online_only_relationship",
      category: "Romance or confidence scam",
      description: "Detects new online relationship context that can become a money movement risk.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Medium",
      rationale: "Online-only relationships can become romance scams when paired with urgency or money movement.",
      action: "Ask neutral discovery questions and look for payment requests, new payees, or secrecy."
    },
    {
      name: "romance_crypto_offer",
      category: "Romance led crypto investment scam",
      description: "Detects online relationship plus crypto or guaranteed investment language.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Romance and fake investment platforms are often combined to create high-confidence fraud pressure.",
      action: "Escalate before any investment transfer and capture platform, payee, and communication details."
    },
    {
      name: "recovery_fee_or_refund",
      category: "Recovery or refund scam",
      description: "Detects recovery fee, refund release, and sensitive-data-for-refund requests.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Recovery scammers target prior victims and often ask for upfront fees or sensitive data.",
      action: "Treat as high risk, verify independently, and warn that legitimate recovery does not require upfront payment."
    },
    {
      name: "fake_bank_alert",
      category: "Fake fraud alert or bank alert scam",
      description: "Detects fake bank text, purchase verification, and suspicious activity call-back language.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Fake fraud alerts can lead customers to call imposters and move funds under pressure.",
      action: "Confirm the contact path, use bank-owned phone numbers only, and review recent profile changes."
    },
    {
      name: "delivery_phishing_link",
      category: "Package delivery or phishing scam",
      description: "Detects delivery-problem links and card capture language.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Medium",
      rationale: "Delivery texts and links are common phishing entry points for card and credential compromise.",
      action: "Review recent card activity, reset exposed credentials if needed, and educate on link safety."
    },
    {
      name: "vendor_payment_change",
      category: "Business email compromise or vendor fraud",
      description: "Detects altered invoice, look-alike email, and vendor wire instruction changes.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Vendor payment changes and look-alike emails are common business email compromise indicators.",
      action: "Require out-of-band vendor verification using a known contact before releasing funds."
    },
    {
      name: "trusted_person_control",
      category: "Elder financial exploitation or trusted person abuse",
      description: "Detects third-party control, isolation, and assisted withdrawal context.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Third-party control or isolation can indicate exploitation, especially when paired with withdrawals.",
      action: "Escalate for vulnerable-customer review and document who is coaching or accompanying the customer."
    },
    {
      name: "guaranteed_return_investment",
      category: "Investment scam",
      description: "Detects guaranteed-return and low-risk/high-return investment claims.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Guaranteed, fast, low-risk investment language is a repeated scam signal.",
      action: "Review investment source and recommend independent verification before any transfer."
    },
    {
      name: "account_takeover_context",
      category: "Account takeover or digital risk",
      description: "Detects suspicious login, new device, profile change, and payment app context.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Account takeover context increases risk when paired with customer confusion or new money movement.",
      action: "Review authentication, recent profile changes, new payees, and digital access history."
    },
    {
      name: "phone_takeover_or_sim_swap",
      category: "Account Takeover via Phone Compromise",
      description: "Detects SIM swap, phone number porting, carrier takeover, and 2FA interception language.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Phone-number takeover can let criminals intercept security codes and reset banking credentials.",
      action: "Verify the customer using known contact methods, review profile changes, and check for new payees or unusual transfers."
    },
    {
      name: "healthcare_fraud_or_medical_urgency",
      category: "Healthcare or Insurance Fraud",
      description: "Detects medical, insurance, Medicare, pharmacy, and telehealth payment urgency.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "High",
      rationale: "Healthcare urgency can pressure customers into fast payments or credential sharing before independent verification.",
      action: "Ask the customer to verify with the provider using a known phone number and avoid wire, gift card, or crypto payment methods."
    },
    {
      name: "crypto_exchange_impersonation",
      category: "Fake Cryptocurrency Exchange or Platform",
      description: "Detects fake crypto apps, lookalike exchanges, wallet redirection, and withdrawal fee traps.",
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
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      riskTier: "Critical",
      rationale: "Fake crypto platforms show false balances and trap customers with fees, taxes, or new deposits before withdrawal.",
      action: "Stop the transfer, verify the platform independently, and capture wallet, website, app, and contact details for Fraud."
    }
  ];

  // CONCEPT layer (broadened static matching).
  // The phrase rules above require precise multi-word phrases ("bitcoin atm").
  // These concept groups add single-word / alias / stem triggers so a bare
  // mention like "bitcoin", "BTC", "crypto", or "wire transfer" also fires.
  // Each concept points at an existing rule by name and inherits its category,
  // scoreLift, and tier -- so the merge/dedup logic treats a concept hit and a
  // phrase hit for the same rule as one match (higher lift wins, no double
  // count). This runs everywhere, including the offline file:// demo. It is
  // word/alias matching, not true understanding -- a fully paraphrased note
  // with no trigger words still needs the server-side AI layer.
  const CONCEPT_RULES = [
    {
      reinforces: "crypto_kiosk_or_qr_payment",
      // matched as whole words (with light plural/stem tolerance), so "crypto"
      // also catches "cryptos"/"crypto's"; "btc" won't match inside other words.
      triggers: ["bitcoin", "btc", "crypto", "cryptocurrency", "ethereum", "eth", "usdt", "stablecoin", "coinbase", "binance", "kraken", "blockchain", "cold wallet", "crypto wallet", "digital currency", "digital wallet"]
    },
    {
      reinforces: "guaranteed_return_investment",
      triggers: ["investment", "invest", "investing", "guaranteed return", "guaranteed returns", "double your money", "high return", "passive income", "trading platform", "forex", "day trading"]
    },
    {
      reinforces: "crypto_exchange_impersonation",
      triggers: ["fake exchange", "withdrawal fee", "verification fee", "cant withdraw", "cannot withdraw", "unable to withdraw", "release fee", "unlock my funds"]
    },
    {
      reinforces: "safe_account_or_threat_script",
      triggers: ["safe account", "government grant", "irs", "social security", "arrest warrant", "legal action", "gift card", "gift cards"]
    },
    {
      reinforces: "remote_access_or_secure_funds",
      triggers: ["anydesk", "teamviewer", "remote access", "remote control", "screen share", "secure my funds", "move my money to protect"]
    },
    {
      reinforces: "recovery_fee_or_refund",
      triggers: ["recovery", "recover my funds", "get my money back", "refund", "overpayment", "compensation fund"]
    },
    {
      reinforces: "vendor_payment_change",
      triggers: ["wire transfer", "wire the funds", "change of bank details", "updated banking details", "new account number", "ach change"]
    },
    {
      reinforces: "romance_crypto_offer",
      triggers: ["met online", "dating app", "online boyfriend", "online girlfriend", "never met in person", "long distance relationship"]
    }
  ];

  const DERISKING_RULES = [
    {
      name: "verified_legitimate",
      description: "A fraud note confirms the activity was independently verified.",
      scoreLift: -8,
      phrases: [
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
      ],
      conditions: function conditions(customer, source) {
        return containsAny(source.text, this.phrases);
      },
      action: "Keep note on file and continue standard monitoring."
    }
  ];

  function evaluateFraudRules(customer, options) {
    const config = {
      maxPositiveLift: 36,
      maxNegativeLift: -10,
      includeExtraSources: false,
      ...(options || {})
    };
    const baseScore = clampScore(Number(customer && customer.fraudRiskScore) || 0);
    const sources = getAnalysisSources(customer, config);
    const matchesByRule = new Map();
    const deriskingMatches = [];

    sources.forEach(function evaluateSource(source) {
      FRAUD_TEXT_RULES.forEach(function evaluateRule(rule) {
        if (!rule.conditions(customer, source)) {
          return;
        }

        const existing = matchesByRule.get(rule.name);
        const matchedPhrase = findMatchedPhrase(source.text, rule.phrases);
        const match = {
          name: rule.name,
          category: rule.category,
          description: rule.description,
          confidence: rule.confidence,
          scoreLift: rule.scoreLift,
          riskTier: rule.riskTier,
          rationale: rule.rationale,
          action: rule.action,
          sourceLabel: source.label,
          sourceType: source.type,
          sourceText: source.text,
          matchedPhrase
        };

        if (!existing || match.scoreLift > existing.scoreLift) {
          matchesByRule.set(rule.name, match);
        }
      });

      DERISKING_RULES.forEach(function evaluateDerisking(rule) {
        if (!rule.conditions(customer, source)) {
          return;
        }

        deriskingMatches.push({
          name: rule.name,
          category: "Verified lower-risk context",
          description: rule.description,
          confidence: "Medium",
          scoreLift: rule.scoreLift,
          riskTier: "Low",
          rationale: "A fraud note documents independent verification or a false alarm.",
          action: rule.action,
          sourceLabel: source.label,
          sourceType: source.type,
          sourceText: source.text,
          matchedPhrase: findMatchedPhrase(source.text, rule.phrases)
        });
      });

      // Concept layer: single-word / alias triggers that reinforce a rule even
      // when its precise phrases are absent (e.g. bare "bitcoin" -> crypto rule).
      CONCEPT_RULES.forEach(function evaluateConcept(concept) {
        const matchedConcept = findMatchedConcept(source.text, concept.triggers);
        if (!matchedConcept) {
          return;
        }
        const rule = FRAUD_TEXT_RULES.find(function byName(r) {
          return r.name === concept.reinforces;
        });
        if (!rule) {
          return;
        }
        const existing = matchesByRule.get(rule.name);
        const match = {
          name: rule.name,
          category: rule.category,
          description: rule.description,
          confidence: rule.confidence,
          scoreLift: rule.scoreLift,
          riskTier: rule.riskTier,
          rationale: rule.rationale,
          action: rule.action,
          sourceLabel: source.label,
          sourceType: source.type,
          sourceText: source.text,
          matchedPhrase: matchedConcept,
          detectedBy: "concept"
        };
        if (!existing || match.scoreLift > existing.scoreLift) {
          matchesByRule.set(rule.name, match);
        }
      });
    });

    // Merge in any LLM-derived matches passed by the caller. The keyword engine
    // above is the instant baseline; these add semantic catches it missed (e.g.
    // "BTC", paraphrases). Same dedup rule: per category, keep the higher lift,
    // so a note that triggers both layers isn't double-counted.
    if (Array.isArray(config.llmMatches)) {
      config.llmMatches.forEach(function mergeLlmMatch(raw) {
        if (!raw || !raw.name) {
          return;
        }
        const existing = matchesByRule.get(raw.name);
        const match = {
          name: raw.name,
          category: raw.category,
          description: raw.description,
          confidence: raw.confidence || "Medium",
          scoreLift: raw.scoreLift,
          riskTier: raw.riskTier,
          rationale: raw.rationale,
          action: raw.action,
          sourceLabel: raw.sourceLabel || "AI review of fraud notes",
          sourceType: "llm",
          sourceText: raw.sourceText || "",
          matchedPhrase: raw.matchedPhrase || null,
          detectedBy: "llm"
        };
        if (!existing || match.scoreLift > existing.scoreLift) {
          matchesByRule.set(raw.name, match);
        }
      });
    }

    const positiveMatches = Array.from(matchesByRule.values()).sort(function sortByLift(a, b) {
      return b.scoreLift - a.scoreLift;
    });
    const positiveLift = positiveMatches.reduce(function sumLift(total, match) {
      return total + match.scoreLift;
    }, 0);
    const negativeLift = deriskingMatches.reduce(function sumLift(total, match) {
      return total + match.scoreLift;
    }, 0);
    const scoreLift = Math.max(config.maxNegativeLift, Math.min(config.maxPositiveLift, positiveLift + negativeLift));
    const adjustedScore = clampScore(baseScore + scoreLift);
    const topRisks = positiveMatches.slice(0, 5);
    const topMatch = topRisks[0] || null;

    return {
      baseScore,
      adjustedScore,
      scoreLift,
      riskTier: getFraudRiskTier(adjustedScore),
      topCategory: topMatch ? topMatch.category : "No phrase-family match",
      summary: topMatch
        ? `${topMatch.description} Source: ${topMatch.sourceLabel}.`
        : "No high-confidence scam language detected in active Fraud Notes.",
      topAction: topMatch ? topMatch.action : "Continue standard monitoring or add Fraud Notes if new scam language appears.",
      actions: unique(topRisks.map(function toAction(match) {
        return match.action;
      })),
      matches: topRisks.concat(deriskingMatches),
      topRisks,
      deriskingMatches,
      sourcesAnalyzed: sources.length,
      ruleCount: FRAUD_TEXT_RULES.length,
      llmAssisted: positiveMatches.some(function isLlm(m) { return m.detectedBy === "llm"; }),
      scoringModel: "Base fraud score plus active Fraud Note phrase matches, capped from -10 to +36."
    };
  }

  function analyzeFraudText(text) {
    const source = {
      label: "Text sample",
      type: "text",
      text: text || ""
    };

    return FRAUD_TEXT_RULES.filter(function ruleMatches(rule) {
      return rule.conditions({}, source);
    }).map(function mapRule(rule) {
      return {
        name: rule.name,
        category: rule.category,
        description: rule.description,
        confidence: rule.confidence,
        scoreLift: rule.scoreLift,
        matchedPhrase: findMatchedPhrase(source.text, rule.phrases),
        action: rule.action
      };
    });
  }

  function getAnalysisSources(customer, config) {
    const fraudNotes = Array.isArray(customer && customer.fraudNotes) ? customer.fraudNotes : [];
    const sources = fraudNotes.map(function mapNote(note) {
      return {
        type: "fraud_note",
        label: `Fraud Note by ${note.author || "Fraud Team"}`,
        text: note.text || note.note || note.noteText || ""
      };
    });

    if (config.includeExtraSources && Array.isArray(config.extraSources)) {
      config.extraSources.forEach(function addExtraSource(source) {
        sources.push({
          type: source.type || "extra",
          label: source.label || "Additional fraud signal",
          text: source.text || ""
        });
      });
    }

    return sources;
  }

  function getFraudRiskTier(score) {
    if (score >= 81) return "Critical";
    if (score >= 61) return "High";
    if (score >= 31) return "Medium";
    return "Low";
  }

  function containsAny(text, phrases) {
    const normalizedText = normalizeText(text);
    return phrases.some(function phraseMatches(phrase) {
      return normalizedText.includes(normalizeText(phrase));
    });
  }

  // Concept matcher: matches a trigger as a whole token (or contiguous tokens),
  // not a loose substring -- so "btc" does not match inside "btcouples" and
  // "invest" matches "invest"/"invests"/"investing" via a light stem allowance.
  // Single-word triggers get word-boundary matching; multi-word triggers fall
  // back to phrase containment (already boundary-safe enough in practice).
  function matchesConcept(text, trigger) {
    const normalizedText = normalizeText(text);
    const normalizedTrigger = normalizeText(trigger);
    if (!normalizedTrigger) {
      return false;
    }
    if (normalizedTrigger.includes(" ")) {
      return normalizedText.includes(normalizedTrigger);
    }
    // whole-word, allowing a short suffix (s, es, ing, ed, 's) for stems
    const pattern = new RegExp(
      "(^|\\s)" + escapeRegExp(normalizedTrigger) + "(s|es|ing|ed)?(\\s|$)"
    );
    return pattern.test(normalizedText);
  }

  function findMatchedConcept(text, triggers) {
    return triggers.find(function isHit(trigger) {
      return matchesConcept(text, trigger);
    }) || null;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findMatchedPhrase(text, phrases) {
    const normalizedText = normalizeText(text);
    return phrases.find(function phraseMatches(phrase) {
      return normalizedText.includes(normalizeText(phrase));
    }) || "";
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clampScore(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  return {
    FRAUD_TEXT_RULES,
    DERISKING_RULES,
    evaluateFraudRules,
    analyzeFraudText,
    getFraudRiskTier
  };
});
