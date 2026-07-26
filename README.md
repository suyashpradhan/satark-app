# Satark — Pehle jaanch, phir kadam.

Satark is a multilingual call-safety assistant built for my Hindi- and
Marathi-speaking parents. A user puts a suspicious call on speaker and taps
**Start listening**. Satark transcribes the conversation, detects risky actions
such as sharing an OTP, transferring money, scanning a QR code, installing an
app, or handing over documents, and displays a clear warning before the user
acts.

Satark does not identify callers, block telephone calls, or prove that a caller
is fraudulent. It helps the user pause, understand why a request is risky, and
choose a safer next step.

## Current product flow

1. The user opens Satark and taps **Start listening**.
2. The browser requests microphone permission.
3. The call is placed on speaker near the device.
4. Satark records independent 5.5-second audio segments.
5. Each segment is transcribed using Sarvam Saaras v3.
6. The returned text is appended to the visible live transcript.
7. Deterministic rules immediately check the accumulated conversation.
8. When those rules do not decide, Sarvam-30B checks the meaning of the full
   conversation for indirect or mixed-language social engineering.
9. A high-risk request stops listening and displays a full-screen warning.
10. The warning shows the exact phrase that caused Satark to intervene.
11. **Show the next step** opens a simple result with three safety actions and
    an optional trusted-family contact.

A saved audio recording can also be uploaded. That path allows the transcript
to be reviewed and asks a few additional questions before producing a report.

## What Satark detects

Satark looks for an observable risky action, not merely suspicious vocabulary.

High-risk examples include:

- asking for an OTP, PIN, CVV, password, or verification code;
- asking the user to pay, transfer, deposit, or send money;
- asking the user to scan a QR code or use UPI;
- asking for Aadhaar, PAN, passbook, banking, pension, or insurance documents;
- asking the user to install a remote-support application;
- asking for screen sharing or device access;
- combining impersonation with urgency, fear, secrecy, or account threats.

An amount by itself is not enough for a red warning. For example, mentioning
`₹50,000` without asking the listener to pay, share, scan, install, or disclose
anything remains cautionary rather than high risk.

## Technology

- Next.js App Router
- React
- Tailwind CSS
- Sarvam Saaras v3 for speech-to-text
- Sarvam-30B for semantic safety analysis
- Deterministic multilingual safety rules
- PostHog for product analytics and privacy-masked session replay
- Vercel-compatible server routes

## High-level architecture

```text
┌──────────────────────────────────────────────────────────┐
│ Browser                                                  │
│                                                          │
│ Microphone → 5.5s segment → live transcript → warning    │
│ Upload → transcript review → questions → safety report   │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTPS
              ┌────────────▼─────────────┐
              │ Next.js server routes    │
              │                          │
              │ /api/transcribe          │
              │ /api/analyze-live        │
              │ /api/analyze-call        │
              └───────┬──────────┬───────┘
                      │          │
              ┌───────▼───┐  ┌───▼────────────┐
              │ Saaras v3 │  │ Sarvam-30B     │
              │ STT REST  │  │ JSON analysis │
              └───────────┘  └────────────────┘
                      │          │
                      └────┬─────┘
                           ▼
                  Deterministic safeguards
                           │
                           ▼
                   User-visible action
```

The Sarvam API key exists only in the server environment. It is never included
in browser JavaScript.

## Button and request flow

### Start listening

1. Calls `navigator.mediaDevices.getUserMedia()`.
2. Creates one `MediaRecorder` stream.
3. Records a 5.5-second segment.
4. Starts the next segment before processing the completed segment so speech is
   not intentionally discarded during the API request.
5. Sends each completed segment to `POST /api/transcribe`.
6. Appends the returned text to the complete session transcript.
7. Runs `fallbackAssessment()` against the accumulated conversation.
8. If the local rules do not raise a warning, sends the accumulated transcript
   to `POST /api/analyze-live` for meaning-based analysis.
9. A high-risk result stops the microphone, vibrates supported devices, plays a
   short alert tone, and displays the warning.

This is near-live rather than a telephone integration. Detection latency is one
audio segment plus transcription and analysis time.

### Show the next step

For a live high-risk detection, this action bypasses the additional questionnaire
and immediately shows:

- why Satark stopped the flow;
- end-the-call guidance;
- a reminder not to share or pay anything;
- independent verification guidance;
- trusted-family contact and sharing actions.

### Use a saved recording

1. Opens the browser file picker.
2. Keeps the selected file in browser memory for playback.
3. Sends it to `/api/transcribe` after the user continues.
4. Shows an editable transcript.
5. Collects expected-call, sensitive-request, and pressure answers.
6. Sends the confirmed evidence to `/api/analyze-call`.

### Send to family

The browser creates a plain-text safety summary. If Web Share is supported, the
native share sheet opens. Otherwise, the message is copied to the clipboard.
Satark never sends a message automatically.

### Contact my family

The optional trusted-family number is stored in browser `localStorage`. The
button uses the device's `tel:` handler. The user must still confirm and place
the call. The number is not sent to Sarvam.

## API contracts

### `POST /api/transcribe`

Content type: `multipart/form-data`

| Field | Type | Purpose |
|---|---|---|
| `audio` | File | Supported audio recording |
| `language` | String | `unknown`, `en-IN`, `hi-IN`, or `mr-IN` |

The server validates the file and sends it to Sarvam's speech-to-text endpoint
using `model=saaras:v3` and `mode=transcribe`.

Example response:

```json
{
  "transcript": "आपके मोबाइल पर OTP आया होगा...",
  "detectedLanguage": "hi-IN",
  "languageProbability": 0.96
}
```

### `POST /api/analyze-live`

Content type: `application/json`

```json
{
  "transcript": "the complete accumulated live transcript"
}
```

Sarvam-30B evaluates Hindi, Marathi, English, Hinglish, and mixed-language
meaning. It returns `low`, `caution`, or `high` plus exact transcript evidence.
An amount or reward mentioned without a requested action must not return high.

### `POST /api/analyze-call`

Content type: `application/json`

```json
{
  "transcript": "confirmed transcript",
  "language": "en-IN",
  "expectedCall": "pension",
  "sensitiveRequest": "yes",
  "pressureUsed": "yes"
}
```

The route requests schema-constrained output from Sarvam-30B and then applies
deterministic safeguards. It never treats the model as proof of caller identity.

## Safety layers

Satark uses two complementary detection paths.

### Deterministic rules

`lib/safety.js` provides a fast local safety net for critical multilingual
requests. It is predictable and remains available if semantic analysis fails.

### Semantic analysis

`/api/analyze-live` uses Sarvam-30B to catch paraphrasing, mixed-language speech,
multi-step manipulation, and social engineering that cannot be represented by
a finite keyword list.

The red warning requires an observable sensitive request or manipulation toward
an action. Suspicious claims without that action remain cautionary.

## Data lifecycle

### Browser memory

During an open session, React state holds:

- selected languages;
- the temporary audio file and playback URL;
- live and uploaded transcripts;
- confirmation answers;
- the current safety result.

This state disappears on refresh or reset.

### Browser persistence

`localStorage` contains only:

- preferred call language;
- preferred interface language;
- optional trusted-family phone number.

### Not persisted by the application

- raw audio on disk;
- transcripts in a database;
- safety reports in a database;
- OTPs, passwords, PINs, or financial credentials;
- the Sarvam API key in browser code.

Audio and transcript data are transmitted to Sarvam only when required for the
requested transcription or analysis. A production launch requires explicit
consent, retention review, and applicable privacy-policy updates.

## Caching

Sensitive requests are not cached:

- API routes return `Cache-Control: no-store, max-age=0`;
- server-to-Sarvam requests use `cache: "no-store"`;
- temporary audio object URLs are revoked when replaced or reset;
- the service worker bypasses `/api/` traffic;
- transcripts and safety responses are not placed in a shared CDN cache.

Only public application-shell assets, icons, and the offline page may be cached.

## PostHog analytics and session replay

PostHog is initialized in `instrumentation-client.js`. It captures anonymous
navigation, clicks, and interface interactions.

Because Satark processes sensitive conversations:

- all input values are masked;
- transcript text is marked with `.ph-sensitive` and masked;
- detected evidence and report details are masked;
- query strings are removed from captured URLs;
- no PostHog personal API key is exposed to the client.

To enable replay, add the public project token and ingestion host, enable Session
Replay in PostHog, and set the desired sampling percentage. A 100% sample records
every eligible session, subject to browser connectivity and tracking blockers.

## Environment variables

Create `.env.local`:

```bash
SARVAM_API_KEY=sk_...
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Use the exact PostHog US or EU ingestion host shown in Project Settings.
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is a public browser token. Never place a
PostHog personal API key or the Sarvam secret inside `NEXT_PUBLIC_*`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Run the safety tests:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Add all three environment variables to Project Settings.
3. Deploy or redeploy after changing public environment variables.
4. Open the HTTPS deployment and grant microphone access.
5. Test one OTP/payment scenario, one amount-only scenario, and one ordinary
   conversation.
6. Confirm that PostHog receives events and a privacy-masked replay.

### Production hardening

Before public production use:

- add rate limiting and abuse protection;
- add consent and a privacy notice;
- confirm third-party data retention terms;
- add redacted operational logs and request IDs;
- monitor latency, errors, and safety fallbacks;
- add an authenticated, encrypted case store only if history is required;
- test with consented elderly users across devices and noisy environments;
- independently evaluate false positives and false negatives.

## Failure handling

| Failure | Current behavior |
|---|---|
| Microphone denied | Shows an error and offers saved recording upload |
| Empty or unsupported audio | Rejects the request with a safe message |
| No speech detected | Stops after repeated empty segments and offers retry |
| Transcription failure | Stops listening and asks the user to retry |
| Semantic live analysis failure | Deterministic safety rules continue working |
| Full analysis failure | Uses the deterministic fallback assessment |
| Ambiguous claim without an action | Returns caution rather than a red warning |

## Known limitations

- The user must manually open Satark.
- The call must be placed on speaker near the browser microphone.
- Satark cannot terminate or intercept a cellular call.
- It cannot authenticate the caller or guarantee that a call is safe.
- Browser and network conditions affect near-live latency.
- Background noise, pronunciation, and device quality affect transcription.
- A trusted-family call is user-initiated; no alert is sent automatically.
- The current prototype has no authenticated cross-device family dashboard.

## Repository map

```text
app/
  page.js                    # Parent UI, recording, live flow, results
  layout.js                  # Metadata and root document
  globals.css                # Visual system and accessibility styles
  manifest.js                # Web app metadata
  offline/page.js            # Offline guidance
  api/
    transcribe/route.js      # File validation and Saaras v3 transcription
    analyze-live/route.js    # Near-live semantic safety analysis
    analyze-call/route.js    # Confirmed report analysis and safeguards
lib/
  safety.js                  # Deterministic multilingual detection rules
tests/
  safety.test.mjs            # Fraud, normal-call, and false-positive tests
instrumentation-client.js    # PostHog analytics and masked replay
public/sw.js                 # Public shell caching; API requests bypassed
.env.local.example           # Safe environment-variable template
README.md                    # Product, architecture, setup, and operations
```

## Future direction

The clearest next product extension is a trusted-family handoff through a
familiar channel such as WhatsApp, followed by an optional caregiver view. A
native Android implementation could explore deeper call integration, subject to
platform permissions, consent, and legal constraints. These are roadmap items,
not current capabilities.
