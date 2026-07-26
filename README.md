# Satark — Pehle jaanch, phir action.

A Hindi/Marathi call-safety assistant for elderly users. It transcribes a short recording with Saaras v3, identifies risky requests with Sarvam-30B, and creates a calm verification card without claiming to identify the caller.

## Run locally

1. Copy `.env.local.example` to `.env.local`.
2. Add your Sarvam key as `SARVAM_API_KEY`.
3. Run `npm install`.
4. Run `npm run dev` and open `http://localhost:3000`.

The key is read only in the server route and is never sent to the browser.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete request flow, data lifecycle, caching policy, security boundary, and deployment plan.

## MVP limits

- Recordings are limited to 28 seconds for the Saaras REST endpoint.
- Browser recording and audio upload are both supported.
- The app does not identify callers or prove fraud.
- Audio is processed in-memory and not persisted by the application.
