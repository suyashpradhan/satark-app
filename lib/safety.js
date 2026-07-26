export const safetySchema = {
  name: "call_safety_assessment",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["riskLevel", "callerClaim", "reasonForCall", "requests", "warningSignals", "doNotShare", "safeNextSteps", "summary"],
    properties: {
      riskLevel: { type: "string", enum: ["low", "caution", "high"] },
      callerClaim: { type: "string" },
      reasonForCall: { type: "string" },
      requests: { type: "array", items: { type: "string" } },
      warningSignals: { type: "array", items: { type: "string" } },
      doNotShare: { type: "array", items: { type: "string" } },
      safeNextSteps: { type: "array", minItems: 1, items: { type: "string" } },
      summary: { type: "string" }
    }
  }
};

// These rules are deliberately conservative. They are a fast local safety net
// for live mode; the detailed report still uses the confirmed transcript.
const riskSignalGroups = [
  {
    label: "OTP, PIN, CVV, password, or verification code was mentioned",
    patterns: [
      /\botp\b|o\s*t\s*p|ओ\s*टी\s*पी|ओटीपी|ओटिपी|वन[ -]?टाइम पास(?:वर्ड|कोड)?/iu,
      /\bpin\b|पिन|\bcvv\b|सी\s*वी\s*वी|सीवीवी|password|पासवर्ड|पास कोड/iu,
      /(?:verification|security)\s*code|वेरिफिकेशन कोड|सिक्योरिटी कोड|सत्यापन कोड/iu,
      /कोड.{0,35}(?:सांगा|शेअर|शेयर|बताइए|बताओ|बताना|दे दीजिए)|code.{0,35}(?:tell|share|send|read)/iu,
    ],
  },
  {
    label: "Payment, transfer, QR code, or fee was requested",
    patterns: [
      /payment|पेमेंट|भुगतान|पैसे.{0,30}(?:भेज|ट्रांसफर|जमा)|रुप(?:ये|ए)|₹/iu,
      /\bupi\b|यू\s*पी\s*आई|यूपीआई|qr\s*code|\bqr\b|क्यू\s*आर|क्यूआर|स्कैन/iu,
      /processing\s*(?:fee|charge)|प्रोसेसिंग\s*(?:फीस|शुल्क|चार्ज)|शुल्क.{0,25}(?:देना|भुगतान|जमा)/iu,
      /refund|रिफंड|कैशबैक|इनाम|prize|लॉटरी/iu,
    ],
  },
  {
    label: "Sensitive identity or financial documents were requested",
    patterns: [
      /aadhaa?r|आधार|\bpan\b|पैन\s*(?:कार्ड)?|पासबुक|passbook/iu,
      /bank\s*(?:statement|details)|बैंक.{0,20}(?:स्टेटमेंट|विवरण|डिटेल|खाता)|account\s*(?:number|details)|खाता\s*नंबर/iu,
      /(?:दस्तावेज़|दस्तावेज|कागजात|documents?).{0,40}(?:कॉपी|copy|तैयार|लेकर|भेज|share|शेअर|शेयर)/iu,
      /(?:कॉपी|copy).{0,30}(?:तैयार|भेज|share|शेअर|शेयर|दे)|(?:लेकर|collect).{0,30}(?:दस्तावेज़|दस्तावेज|कागजात|documents?)/iu,
    ],
  },
  {
    label: "An app install or remote screen access was requested",
    patterns: [
      /screen\s*share|स्क्रीन\s*शेयर|anydesk|एनीडेस्क|teamviewer|टीमव्यूअर|rustdesk/iu,
      /quick\s*support|क्विक\s*सपोर्ट|remote\s*support|रिमोट\s*सपोर्ट/iu,
      /(?:अॅप|ऐप|app).{0,30}(?:डाउनलोड|download|install|इंस्टॉल)|(?:डाउनलोड|download|install|इंस्टॉल).{0,30}(?:अॅप|ऐप|app)/iu,
    ],
  },
];

const urgencyPatterns = [
  /अभी|तुरंत|फौरन|तत्काल|ताबडतोब|लगेच|immediately|urgent|आज\s*(?:ही|शाम)|बंद हो|बंद होईल|block|suspend|रुक जाएगी|रुक जाएगा|समाप्त हो|expire|नहीं तो|वरना/iu,
];

function normalizeTranscript(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceAroundMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || match.index == null) continue;
    const start = Math.max(0, match.index - 28);
    const end = Math.min(text.length, match.index + match[0].length + 38);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";
    return `${prefix}${text.slice(start, end).trim()}${suffix}`;
  }
  return "";
}

export function fallbackAssessment(transcript) {
  const normalized = normalizeTranscript(transcript);
  const matchedGroups = riskSignalGroups.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(normalized)),
  );
  const highRiskPatterns = riskSignalGroups.flatMap(({ patterns }) => patterns);
  const urgent = urgencyPatterns.some((pattern) => pattern.test(normalized));
  const high = matchedGroups.length > 0;
  const evidencePhrases = [
    evidenceAroundMatch(normalized, highRiskPatterns),
    evidenceAroundMatch(normalized, urgencyPatterns),
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  return {
    riskLevel: high ? "high" : urgent ? "caution" : "caution",
    callerClaim: "Caller identity has not been independently verified",
    reasonForCall: "Review the transcript before acting",
    requests: matchedGroups.map(({ label }) => label),
    warningSignals: [
      ...matchedGroups.map(({ label }) => label),
      ...(urgent ? ["The caller used urgency or a consequence to pressure you"] : []),
    ],
    doNotShare: ["OTP", "PIN", "CVV", "Password"],
    safeNextSteps: [
      "End the call without sharing information or making a payment.",
      "Contact the organisation using the number on its official website, card, or document—not a number given by the caller.",
      "Ask a trusted family member to review this safety card if you are unsure."
    ],
    summary: high
      ? "This call contains a potentially unsafe request. Do not act until you verify it independently."
      : "The caller has not been verified. Pause and confirm the request through an official channel.",
    evidencePhrases,
    analysisMode: "rule-based fallback"
  };
}
