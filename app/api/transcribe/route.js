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
  if (!apiKey) return json({ error: "Sarvam API key is not configured." }, 503);

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const language = incoming.get("language") || "unknown";

    if (!(audio instanceof File)) return json({ error: "Please record or upload an audio file." }, 400);
    if (audio.size === 0) return json({ error: "The audio file is empty." }, 400);
    if (audio.size > MAX_FILE_SIZE) return json({ error: "Audio must be smaller than 15 MB." }, 400);
    if (audio.type && !ALLOWED_TYPES.has(audio.type)) {
      return json({ error: "Unsupported audio format. Use WebM, WAV, MP3, M4A, OGG, AAC, or FLAC." }, 400);
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
      return json({ error: "Sarvam could not transcribe this audio.", details }, response.status);
    }

    const data = JSON.parse(responseText);
    const transcript = data.transcript?.trim();
    if (!transcript) return json({ error: "No speech was detected. Try again closer to the speaker." }, 422);

    return json({
      transcript,
      detectedLanguage: data.language_code || language,
      languageProbability: data.language_probability ?? null,
      quickSafety: fallbackAssessment(transcript),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return json({ error: timedOut ? "Transcription took too long. Try a shorter recording." : "Something went wrong while transcribing the call." }, 500);
  }
}
