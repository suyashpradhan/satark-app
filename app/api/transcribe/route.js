import { NextResponse } from "next/server";
import { fallbackAssessment } from "@/lib/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
  "audio/mp4", "audio/m4a", "audio/ogg", "audio/aac", "audio/flac"
]);

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return json({ error: "आवाज़ पहचान सेवा उपलब्ध नहीं है।" }, 503);

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const language = incoming.get("language") || "unknown";

    if (!(audio instanceof File)) return json({ error: "कृपया आवाज़ रिकॉर्ड करें या रिकॉर्डिंग चुनें।" }, 400);
    if (audio.size === 0) return json({ error: "रिकॉर्डिंग खाली है।" }, 400);
    if (audio.size > MAX_FILE_SIZE) return json({ error: "रिकॉर्डिंग 15 एमबी से छोटी होनी चाहिए।" }, 400);
    const normalizedType = audio.type?.split(";")[0];
    if (normalizedType && !ALLOWED_TYPES.has(normalizedType)) {
      return json({ error: "यह रिकॉर्डिंग प्रारूप समर्थित नहीं है।" }, 400);
    }

    const body = new FormData();
    body.append("file", audio, audio.name || "call.webm");
    body.append("model", "saaras:v3");
    body.append("mode", "transcribe");
    body.append("language_code", language);

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let details = responseText;
      try { details = JSON.parse(responseText)?.detail || responseText; } catch {}
      return json({ error: "रिकॉर्डिंग समझ नहीं आई। कृपया फिर से कोशिश करें।", details }, response.status);
    }

    const data = JSON.parse(responseText);
    const transcript = data.transcript?.trim();
    if (!transcript) return json({ error: "आवाज़ नहीं मिली। फ़ोन को स्पीकर के पास रखकर फिर कोशिश करें।" }, 422);

    return json({
      transcript,
      detectedLanguage: data.language_code || language,
      languageProbability: data.language_probability ?? null,
      quickSafety: fallbackAssessment(transcript),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return json({ error: timedOut ? "रिकॉर्डिंग समझने में बहुत समय लगा। छोटी रिकॉर्डिंग से कोशिश करें।" : "रिकॉर्डिंग समझते समय समस्या हुई।" }, 500);
  }
}
