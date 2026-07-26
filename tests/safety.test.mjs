import test from "node:test";
import assert from "node:assert/strict";
import { fallbackAssessment } from "../lib/safety.js";

const riskyScenarios = [
  "नमस्ते मैडम, आपकी स्वास्थ्य बीमा पॉलिसी की जाँच बाकी है। हमारा प्रतिनिधि आज शाम घर आएगा। कृपया आधार, पैन कार्ड और बैंक पासबुक की कॉपी तैयार रखिए। वह दस्तावेज़ लेकर पॉलिसी अपडेट कर देगा।",
  "नमस्कार मैडम, आपके पेंशन खाते का KYC आज समाप्त हो रहा है। यदि अभी अपडेट नहीं किया गया तो अगले महीने की पेंशन रुक जाएगी। आपके मोबाइल पर OTP आएगा। कृपया वह OTP मुझे तुरंत बताइए।",
  "नमस्ते सर, आपकी पुरानी जीवन बीमा पॉलिसी में अठारह हज़ार पाँच सौ रुपये का रिफंड बचा हुआ है। रिफंड जारी करने के लिए चार सौ निन्यानवे रुपये का प्रोसेसिंग शुल्क देना होगा। मैं WhatsApp पर QR भेज रहा हूँ। अभी भुगतान कर दीजिए।",
];

test("all supplied Hindi scam scenarios trigger a high-risk warning", () => {
  for (const transcript of riskyScenarios) {
    const result = fallbackAssessment(transcript);
    assert.equal(result.riskLevel, "high", transcript);
    assert.ok(result.evidencePhrases.length > 0, transcript);
    assert.ok(result.warningSignals.length > 0, transcript);
  }
});

test("a normal family call does not trigger the red warning", () => {
  const result = fallbackAssessment("नमस्ते माँ, मैं शाम को घर आऊँगा। क्या सब्ज़ी लेकर आऊँ?");
  assert.equal(result.riskLevel, "caution");
  assert.equal(result.evidencePhrases.length, 0);
});
