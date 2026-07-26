import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const WARNINGS = {
  "hi-IN": "रुकिए। कॉल काट दीजिए। कोई गुप्त संख्या, दस्तावेज़ या पैसा साझा न करें। परिवार के किसी भरोसेमंद व्यक्ति से बात करें।",
  "mr-IN": "थांबा. कॉल बंद करा. कोणताही गुप्त क्रमांक, कागदपत्र किंवा पैसे देऊ नका. कुटुंबातील विश्वासू व्यक्तीशी बोला.",
};

function error(message, status) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return error("आवाज़ चेतावनी उपलब्ध नहीं है।", 503);

  try {
    const input = await request.json();
    const language = input.language === "mr-IN" ? "mr-IN" : "hi-IN";
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: WARNINGS[language],
        target_language_code: language,
        model: "bulbul:v3",
        speaker: "shubh",
        pace: 0.9,
        speech_sample_rate: 24000,
        output_audio_codec: "wav",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return error("आवाज़ चेतावनी तैयार नहीं हुई।", 502);
    const data = await response.json();
    const encoded = data.audios?.[0];
    if (!encoded) return error("आवाज़ चेतावनी तैयार नहीं हुई।", 502);

    return new NextResponse(Buffer.from(encoded, "base64"), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": "inline; filename=warning.wav",
      },
    });
  } catch {
    return error("आवाज़ चेतावनी तैयार नहीं हुई।", 500);
  }
}
