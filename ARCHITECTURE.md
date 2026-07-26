# Satark — System Architecture

> Status: Hackathon prototype. This document describes what is implemented now and clearly labels production extensions.

## 1. Product boundary

Satark helps an elderly Hindi- or Marathi-speaking user examine a suspicious call and choose a safer next action. It does not authenticate a caller, prove fraud, intercept telephone calls, or make financial decisions.

The current golden path is:

1. Record up to 28 seconds in the browser or select an audio file.
2. Transcribe the audio with Sarvam Saaras v3.
3. Let the user correct the transcript.
4. Ask three short verification questions.
5. Analyse the confirmed evidence with Sarvam-30B.
6. Apply deterministic safety rules for critical requests.
7. Show a safety result and independently verifiable next steps.
8. Share the result with a trusted family member.

The demo also includes a near-live path: the browser records independent 5.5-second segments, transcribes each through the same server endpoint, appends the text, and applies deterministic critical-risk rules. A critical request stops monitoring immediately. This deliberately avoids exposing the API key through a browser-to-Sarvam WebSocket.

## 2. High-level architecture

```text
┌───────────────────────────────────────────────┐
│ Browser / Next.js client                     │
│                                               │
│ Record or upload → confirm → answer → resolve │
└──────────────────────┬────────────────────────┘
                       │ HTTPS
          ┌────────────▼────────────┐
          │ Next.js server routes   │
          │                         │
          │ /api/transcribe         │
          │ /api/analyze-call       │
          └───────┬─────────┬───────┘
                  │         │
          audio   │         │ confirmed text + answers
                  │         │
       ┌──────────▼───┐  ┌──▼────────────────┐
       │ Saaras v3    │  │ Sarvam-30B        │
       │ Speech-to-   │  │ Structured safety │
       │ text REST    │  │ analysis          │
       └──────────────┘  └───────────────────┘
                              │
                        deterministic rules
                              │
                       safe JSON response
```

The Sarvam API key exists only in the server environment. The browser never receives it.

## 3. What happens when a user clicks each button

### Record now

1. The browser requests microphone permission through `getUserMedia`.
2. `MediaRecorder` captures WebM/Opus audio.
3. Recording stops manually or after 28 seconds.
4. The browser creates an in-memory `File` and a temporary object URL for playback.
5. No request is sent until the user presses **Continue**.

### Live Check

1. The browser opens one microphone stream after permission.
2. It records an independent 5.5-second WebM segment with `MediaRecorder`.
3. Each completed segment is sent to `POST /api/transcribe`.
4. The next segment begins only after the previous request completes, preventing overlapping API calls.
5. Returned text is appended to the live transcript.
6. The server also returns deterministic `quickSafety` signals.
7. The client uses the Web Audio API only for a local microphone-level meter; raw samples are not retained by the meter.
8. A critical signal vibrates supported devices, ends microphone capture, quotes the detected evidence phrase, and displays a full-screen stop warning.
9. Two consecutive segments with no detectable speech stop the session and offer a guided retry.
10. The accumulated transcript can continue into the confirmation and full-analysis flow.

This is “near-live” because results arrive once per segment plus network latency. Production realtime work can replace it with a server-side Saaras WebSocket proxy after latency and deployment support are verified.

### Choose recording

1. The native file picker opens.
2. The selected audio stays in browser memory.
3. The user can play or remove it before transmission.

### Continue

1. The browser creates `FormData` containing `audio` and `language`.
2. It calls `POST /api/transcribe`.
3. The server validates file presence, MIME type, and the 15 MB application limit.
4. The server sends multipart form data to `POST https://api.sarvam.ai/speech-to-text` with:
   - `model=saaras:v3`
   - `mode=transcribe`
   - selected language or `unknown`
5. The server returns transcript, detected language, and detection probability.
6. The client shows an editable transcript.

### View safe next step

1. The browser sends JSON to `POST /api/analyze-call`:
   - corrected transcript;
   - detected/preferred language;
   - expected-call category;
   - sensitive-request answer;
   - pressure/urgency answer.
2. The server sends the confirmed evidence to `POST https://api.sarvam.ai/v1/chat/completions` using `sarvam-30b`.
3. `response_format=json_schema` constrains the result to the safety schema.
4. Deterministic rules run after the model. OTP, PIN, CVV, password, payment, screen-sharing, and app-installation patterns can force a high-risk result.
5. Any caller-authenticity verdict is removed. The caller remains “not independently verified.”
6. The client renders evidence, warnings, next actions, and the confirmed transcript.

### Send to family

1. The browser creates a plain-text safety summary.
2. If Web Share is available, the native share sheet opens.
3. Otherwise the summary is copied to the clipboard.
4. No message is sent automatically; the user chooses the recipient and confirms sending.

## 4. API contracts

### `POST /api/transcribe`

Content type: `multipart/form-data`

Request:

| Field | Type | Purpose |
|---|---|---|
| `audio` | File | WebM, WAV, MP3, M4A, OGG, AAC, or FLAC |
| `language` | String | `unknown`, `hi-IN`, or `mr-IN` |

Success response:

```json
{
  "transcript": "…",
  "detectedLanguage": "hi-IN",
  "languageProbability": 0.96,
  "quickSafety": {
    "riskLevel": "high",
    "warningSignals": ["Possible request for sensitive information or money"]
  }
}
```

### `POST /api/analyze-live`

Content type: `application/json`

After each successful live transcription segment, the browser sends the
accumulated transcript to this endpoint unless the immediate safety rules have
already raised an alert. Sarvam-30B performs meaning-based analysis across
Hindi, Marathi, English and mixed speech. It looks for indirect or paraphrased
sensitive requests, multi-step social engineering, urgency, secrecy, fear,
rewards and instructions to leave official channels. The transcript is treated
as untrusted content rather than instructions. Responses are not cached.

### `POST /api/analyze-call`

Content type: `application/json`

Request:

```json
{
  "transcript": "user-confirmed text",
  "language": "hi-IN",
  "expectedCall": "pension",
  "sensitiveRequest": "yes",
  "pressureUsed": "yes"
}
```

`sensitiveRequest` and `pressureUsed` accept `yes`, `no`, or `unsure`.

The success response contains the confirmed inputs and a structured `assessment` with risk level, caller claim, stated reason, requests, warning signals, items not to share, safe next steps, summary, analysis mode, and fixed verification status.

### `POST /api/speak-warning`

Accepts only the selected supported language (`hi-IN` or `mr-IN`). The warning
text is fixed on the server to prevent the public endpoint from becoming an
arbitrary speech generator. It calls Sarvam Bulbul v3 and returns WAV audio. If
network speech cannot play, the browser attempts its built-in speech engine.

The optional trusted-family phone number is stored only in browser
`localStorage`; it is never sent to Satark or Sarvam. The emergency action uses
the device's `tel:` handler and still requires the user to place the call.

## 5. Data and storage

### Currently stored

No application database is used.

During one open browser session, React state holds:

- selected language;
- audio `File` and temporary playback URL;
- transcript and user corrections;
- three verification answers;
- structured safety result.

The state disappears on refresh or reset.

### Explicitly not stored by Satark

- raw audio on disk;
- transcript in a database;
- OTP, PIN, CVV, password, or account secrets;
- family contacts;
- call history;
- Sarvam API key in browser code.

Sarvam processes data sent to its APIs under the applicable event/account terms. A production launch requires confirming those retention and processing terms.

### Planned minimal persistence

After the MVP is reliable, a local-first store may hold:

- preferred language;
- trusted family contact labels;
- independently sourced institution contacts;
- case status, not raw audio;
- redacted evidence summary;
- corrections that improve the current case.

Production persistence should use authenticated, encrypted, tenant-separated records with deletion controls and a documented retention period.

## 6. Caching strategy

### Current policy

Sensitive API responses are deliberately not cached.

- Both server routes return `Cache-Control: no-store, max-age=0`.
- Server-to-Sarvam `fetch` calls use `cache: "no-store"`.
- Audio playback uses a temporary browser object URL that is revoked when replaced, reset, or unmounted.
- No service worker caches API responses.
- No CDN should cache `/api/transcribe` or `/api/analyze-call`.

### Safe future caching

Only non-sensitive static assets should be cached:

- JavaScript and CSS build artifacts using content hashes;
- icons and app-shell assets;
- static safety education copy;
- supported language lists.

Never cache raw audio, transcripts, safety assessments, contact information, or case history in a shared CDN cache.

## 7. Failure handling

| Failure | Current behavior | Production extension |
|---|---|---|
| Microphone denied | Offer file upload | Explain device permission steps |
| Unsupported/empty file | Reject before Sarvam call | Client-side pre-validation too |
| Audio over 15 MB | Reject | Chunk/stream with explicit consent |
| No speech detected | Ask for a clearer recording | Noise check and microphone test |
| Saaras timeout/error | Show retry message | Bounded retry and observability |
| Sarvam-30B error | Use deterministic safety fallback | Alert monitoring and safe degradation |
| Unclear transcript | User edits before analysis | Highlight low-confidence regions |
| Model claims authenticity | Server replaces the verdict | Automated policy tests and audit alert |

## 8. Security and privacy

- Keep `SARVAM_API_KEY` only in server environment variables.
- Never expose secrets through `NEXT_PUBLIC_*` variables.
- Validate content type, file size, transcript length, and answer enums.
- Use HTTPS in deployment.
- Do not log request bodies, audio, transcripts, or model responses in production.
- Redact sensitive identifiers before persistence or family sharing.
- Require recording consent and display a clear processing notice.
- Add rate limiting before public access.
- Add CSRF/origin controls if authenticated state-changing endpoints are introduced.
- Treat model output as untrusted and validate it against the JSON schema.

## 9. Deployment strategy

### Hackathon

- Deploy the Next.js application to Vercel or an equivalent Node-compatible platform.
- Configure `SARVAM_API_KEY` as a server-side environment variable.
- Confirm the platform route timeout supports the 45-second transcription budget.
- Verify microphone access over HTTPS.
- Keep three consented fallback recordings locally available for the demo.
- Test from a second phone on mobile data before submission.

### Production

- Front the application with rate limiting and abuse protection.
- Use regional server deployment aligned with privacy requirements.
- Add structured operational logs containing request IDs and timings, never sensitive content.
- Add uptime, latency, error-rate, and safety-fallback monitoring.
- Separate API, database, and static-asset environments.
- Rotate API keys and use deployment-platform secret management.
- Add backups only for the minimal redacted case store, not raw audio.

## 10. Mobile and channel evolution

The web application is the demo and validation surface. A practical production sequence is:

1. Installable PWA with a home-screen shortcut.
2. React Native/Android app with native sharing and trusted contacts.
3. Forwarded voice-message entry where platform and privacy rules allow it.
4. Bank, insurer, pension, or hospital integration for independently registered expected calls.

Do not assume a mobile app can silently capture ordinary cellular-call audio. Number screening and conversation analysis are separate capabilities with different permissions and platform limits.

## 11. Repository map

```text
app/
  page.js                       # Browser UI and state machine
  globals.css                   # Global visual system
  layout.js                     # Metadata and root layout
  api/
    transcribe/route.js         # Audio validation + Saaras v3
    analyze-call/route.js       # Confirmed evidence + Sarvam-30B + rules
lib/
  safety.js                     # JSON schema and deterministic fallback
.env.local                      # Local secret; ignored by Git
.env.local.example              # Safe configuration template
ARCHITECTURE.md                 # This document
README.md                       # Local setup
```

## 12. Next architecture increments

1. Add sensitive-value redaction before rendering or sharing.
2. Add evidence spans connecting warnings to transcript phrases.
3. Add a small case state machine: `needs_check → shared/official_contact → resolved/uncertain`.
4. Add local preferred-language and trusted-contact storage.
5. Add short Hindi/Marathi read-aloud output.
6. Add an evaluation harness using consented labeled recordings.
7. Consider streaming Saaras only after the post-call golden path is reliable.
