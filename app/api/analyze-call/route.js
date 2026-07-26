import { NextResponse } from "next/server";
import { fallbackAssessment, safetySchema } from "@/lib/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANSWERS = new Set(["yes", "no", "unsure"]);
const EXPECTED = new Set([
  "none",
  "bank",
  "pension",
  "hospital",
  "delivery",
  "insurance",
]);

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return json({ error: "कॉल जाँच सेवा उपलब्ध नहीं है।" }, 503);

  try {
    const input = await request.json();
    const transcript =
      typeof input.transcript === "string" ? input.transcript.trim() : "";
    const language = typeof input.language === "string" ? input.language : "unknown";
    const outputLanguage = language === "mr-IN" ? "Marathi" : "Hindi";
    const expectedCall = EXPECTED.has(input.expectedCall)
      ? input.expectedCall
      : "none";
    const sensitiveRequest = ANSWERS.has(input.sensitiveRequest)
      ? input.sensitiveRequest
      : "unsure";
    const pressureUsed = ANSWERS.has(input.pressureUsed)
      ? input.pressureUsed
      : "unsure";

    if (!transcript)
      return json({ error: "आगे बढ़ने से पहले बातचीत का टेक्स्ट जाँच लें।" }, 400);
    if (transcript.length > 10000)
      return json({ error: "यह बातचीत जाँच के लिए बहुत लंबी है।" }, 400);

    let assessment;
    let analysisMode = "Sarvam-30B";

    try {
      const response = await fetch(
        "https://api.sarvam.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sarvam-30b",
            temperature: 0.1,
            reasoning_effort: null,
            max_tokens: 1000,
            messages: [
              {
                role: "system",
                content:
                  `You are a conservative call-safety assistant for elderly Indian users. Analyse meaning across Hindi, Marathi, English and mixed-language speech, including paraphrasing and indirect social engineering. Analyse only observable words in the confirmed transcript and the user's answers. NEVER say a claim is true, false, genuine, fake, fraud, scam, verified, or invalid. You cannot authenticate the caller. In callerClaim, briefly quote or closely paraphrase only who the caller says they are. In reasonForCall, report only their stated reason. Treat requests for credentials, identity/bank/insurance/pension documents, money or fees, QR/UPI, screen sharing, installing apps, links, WhatsApp redirection, or urgent in-person document collection as high risk. Consider pressure, secrecy, fear, rewards, authority and threats even when spread across sentences. An expected call does not make the caller genuine. If the user reports a sensitive request or pressure that is not clear in the transcript, say it was reported by the user rather than quoting it as transcript evidence. Every user-visible value in the JSON must be short, calm, plain ${outputLanguage}; do not mix English into it except unavoidable proper nouns. The safest verification step must use an independently found official number, never contact details supplied in the call. Do not provide financial, legal, or medical advice.`,
              },
              {
                role: "user",
                content: `Output language: ${outputLanguage}.\nExpected call: ${expectedCall}.\nUser says sensitive information, money, or app installation was requested: ${sensitiveRequest}.\nUser says urgency or pressure was used: ${pressureUsed}.\n\nConfirmed transcript:\n${transcript}`,
              },
            ],
            response_format: { type: "json_schema", json_schema: safetySchema },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        },
      );

      if (!response.ok) throw new Error(`Analysis returned ${response.status}`);
      const data = await response.json();
      assessment = JSON.parse(data.choices?.[0]?.message?.content);
    } catch {
      assessment = fallbackAssessment(transcript);
      analysisMode = "Safety fallback";
    }

    const rules = fallbackAssessment(transcript);
    if (rules.riskLevel === "high" || sensitiveRequest === "yes") {
      assessment.riskLevel = "high";
      assessment.warningSignals = [
        ...new Set([
          ...(assessment.warningSignals || []),
          ...rules.warningSignals,
          ...(sensitiveRequest === "yes"
            ? [
                "आपने बताया कि गुप्त जानकारी, पैसे या ऐप की माँग की गई",
              ]
            : []),
        ]),
      ];
      assessment.doNotShare = [
        ...new Set([...(assessment.doNotShare || []), ...rules.doNotShare]),
      ];
    } else if (pressureUsed === "yes" && assessment.riskLevel === "low") {
      assessment.riskLevel = "caution";
      assessment.warningSignals = [
        ...new Set([
          ...(assessment.warningSignals || []),
          "आपने बताया कि कॉलर ने जल्दी करने का दबाव डाला",
        ]),
      ];
    }

    const forbiddenVerdict =
      /\b(true|false|genuine|fake|fraud|fraudulent|scam|verified|invalid)\b/i;
    if (
      !assessment.callerClaim ||
      forbiddenVerdict.test(assessment.callerClaim)
    ) {
      assessment.callerClaim =
        "रिकॉर्डिंग से कॉलर की पहचान स्थापित नहीं हुई";
    }

    return json({
      transcript,
      expectedCall,
      answers: { sensitiveRequest, pressureUsed },
      assessment: {
        ...assessment,
        verificationStatus: "स्वतंत्र रूप से जाँचा नहीं गया",
        analysisMode,
      },
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return json(
      {
        error: timedOut
          ? "सुरक्षा जाँच में बहुत समय लगा। कृपया फिर कोशिश करें।"
          : "कॉल की जाँच करते समय समस्या हुई।",
      },
      500,
    );
  }
}
