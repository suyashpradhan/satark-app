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

const highRiskPatterns = [
  /otp|ओटीपी|pin|पिन|cvv|सीवीवी|password|पासवर्ड/i,
  /screen.?share|स्क्रीन.?शेयर|anydesk|एनीडेस्क|teamviewer/i,
  /quick\s*support|क्विक\s*सपोर्ट|remote\s*support|rustdesk|अॅप.*डाउनलोड|app.*download|डाउनलोड.*अॅप/i,
  /कोड.*(सांगा|शेअर|बताइए|बताना)|code.*(tell|share)/i,
  /transfer|भेजो|भेजिए|पैसे|पेमेंट|payment|upi|यूपीआई/i,
  /card number|कार्ड नंबर|account number|खाता नंबर/i,
];

const urgencyPatterns = [
  /अभी|तुरंत|ताबडतोब|लगेच|immediately|urgent|आज ही|बंद हो|बंद होईल|block|suspend|रुक जाएगी|expire/i,
];

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
  const highMatches = highRiskPatterns.filter((pattern) => pattern.test(transcript));
  const urgent = urgencyPatterns.some((pattern) => pattern.test(transcript));
  const high = highMatches.length > 0;
  const evidencePhrases = [
    evidenceAroundMatch(transcript, highRiskPatterns),
    evidenceAroundMatch(transcript, urgencyPatterns),
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  return {
    riskLevel: high ? "high" : urgent ? "caution" : "caution",
    callerClaim: "Caller identity has not been independently verified",
    reasonForCall: "Review the transcript before acting",
    requests: high ? ["The caller may be requesting sensitive information or an immediate action"] : [],
    warningSignals: [
      ...(high ? ["Possible request for sensitive information or money"] : []),
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
