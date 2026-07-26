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
    label: "गुप्त संख्या या सत्यापन कोड माँगा गया",
    patterns: [
      /\botp\b|o\s*t\s*p|ओ\s*टी\s*पी|ओटीपी|ओटिपी|वन[ -]?टाइम पास(?:वर्ड|कोड)?/iu,
      /\bpin\b|पिन|\bcvv\b|सी\s*वी\s*वी|सीवीवी|password|पासवर्ड|पास कोड/iu,
      /(?:verification|security)\s*code|वेरिफिकेशन कोड|सिक्योरिटी कोड|सत्यापन कोड/iu,
      /कोड.{0,35}(?:सांगा|शेअर|शेयर|बताइए|बताओ|बताना|दे दीजिए)|code.{0,35}(?:tell|share|send|read)/iu,
    ],
  },
  {
    label: "पैसे, भुगतान या शुल्क की माँग की गई",
    patterns: [
      /(?:payment|पेमेंट|भुगतान|पैसे|रुप(?:ये|ए)|₹).{0,35}(?:कर|करा|करें|कीजिए|भेज|ट्रांसफर|जमा|दे(?:ना|दो|दीजिए)?|pay|send|transfer|deposit)/iu,
      /(?:कर|करा|करें|कीजिए|भेज|ट्रांसफर|जमा|दे(?:ना|दो|दीजिए)?|pay|send|transfer|deposit).{0,35}(?:payment|पेमेंट|भुगतान|पैसे|रुप(?:ये|ए)|₹)/iu,
      /(?:\bupi\b|यू\s*पी\s*आई|यूपीआई|qr\s*code|\bqr\b|क्यू\s*आर|क्यूआर).{0,30}(?:स्कैन|scan|pay|payment|पेमेंट|भुगतान|भेज|send)|(?:स्कैन|scan|pay|payment|पेमेंट|भुगतान).{0,30}(?:\bupi\b|यूपीआई|qr\s*code|\bqr\b|क्यूआर)/iu,
      /processing\s*(?:fee|charge)|प्रोसेसिंग\s*(?:फीस|शुल्क|चार्ज)|शुल्क.{0,25}(?:देना|भुगतान|जमा)/iu,
      /(?:refund|रिफंड|कैशबैक|इनाम|prize|लॉटरी).{0,45}(?:fee|charge|शुल्क|फीस|pay|payment|भुगतान|qr|क्यूआर|upi|यूपीआई)/iu,
    ],
  },
  {
    label: "पहचान या बैंक के संवेदनशील दस्तावेज़ माँगे गए",
    patterns: [
      /aadhaa?r|आधार|\bpan\b|पैन\s*(?:कार्ड)?|पासबुक|passbook/iu,
      /bank\s*(?:statement|details)|बैंक.{0,20}(?:स्टेटमेंट|विवरण|डिटेल|खाता)|account\s*(?:number|details)|खाता\s*नंबर/iu,
      /(?:दस्तावेज़|दस्तावेज|कागजात|documents?).{0,40}(?:कॉपी|copy|तैयार|लेकर|भेज|share|शेअर|शेयर)/iu,
      /(?:कॉपी|copy).{0,30}(?:तैयार|भेज|share|शेअर|शेयर|दे)|(?:लेकर|collect).{0,30}(?:दस्तावेज़|दस्तावेज|कागजात|documents?)/iu,
    ],
  },
  {
    label: "ऐप डाउनलोड या फ़ोन का नियंत्रण माँगा गया",
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
    callerClaim: "कॉलर की पहचान स्वतंत्र रूप से जाँची नहीं गई है",
    reasonForCall: "कोई कदम उठाने से पहले बातचीत की जाँच करें",
    requests: matchedGroups.map(({ label }) => label),
    warningSignals: [
      ...matchedGroups.map(({ label }) => label),
      ...(urgent ? ["जल्दी करने का दबाव या नुकसान का डर दिखाया गया"] : []),
    ],
    doNotShare: ["गुप्त संख्या", "कार्ड की जानकारी", "पासवर्ड"],
    safeNextSteps: [
      "बिना कोई जानकारी या पैसा दिए कॉल काट दें।",
      "संस्था की वेबसाइट, कार्ड या दस्तावेज़ पर दिए आधिकारिक नंबर पर स्वयं कॉल करें।",
      "शक हो तो परिवार के किसी भरोसेमंद व्यक्ति को यह सूचना दिखाएँ।"
    ],
    summary: high
      ? "इस कॉल में जोखिम भरी माँग मिली है। स्वतंत्र जाँच से पहले कोई कदम न उठाएँ।"
      : "कॉलर की पहचान नहीं जाँची गई है। रुकें और आधिकारिक माध्यम से पुष्टि करें।",
    evidencePhrases,
    analysisMode: "rule-based fallback"
  };
}
