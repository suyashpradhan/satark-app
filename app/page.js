"use client";

import { useEffect, useRef, useState } from "react";
import { fallbackAssessment } from "@/lib/safety";

const MAX_SECONDS = 28;

function supportedRecordingType() {
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" },
    { mimeType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/webm", extension: "webm" },
  ];
  return candidates.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType)) || { mimeType: "", extension: "webm" };
}

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    mic: <><rect width="12" height="18" x="6" y="2" rx="6"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>,
    stop: <rect width="14" height="14" x="5" y="5" rx="2"/>,
    alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8M20 3v5h-5"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [language, setLanguage] = useState("unknown");
  const [expectedCall, setExpectedCall] = useState("none");
  const [sensitiveRequest, setSensitiveRequest] = useState("unsure");
  const [pressureUsed, setPressureUsed] = useState("unsure");
  const [transcript, setTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [recording, setRecording] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveWarning, setLiveWarning] = useState(null);
  const [processingChunk, setProcessingChunk] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [noSpeech, setNoSpeech] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const liveActiveRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const liveRequestsRef = useRef(0);
  const emptySegmentsRef = useRef(0);
  const audioContextRef = useRef(null);
  const meterFrameRef = useRef(null);
  const chunksRef = useRef([]);
  const fileRef = useRef(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  useEffect(() => () => {
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((value) => {
      if (value + 1 >= MAX_SECONDS) recorderRef.current?.stop();
      return value + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  function setAudioFile(file) {
    if (!file) return;
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setLiveMode(false);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    setLiveWarning(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudio(file);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
    setTranscript("");
    setError("");
    setStatus("ready");
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const format = supportedRecordingType();
      const recorder = format.mimeType ? new MediaRecorder(stream, { mimeType: format.mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const actualType = recorder.mimeType || format.mimeType || "audio/webm";
        const extension = actualType.includes("mp4") ? "m4a" : format.extension;
        const blob = new Blob(chunksRef.current, { type: actualType });
        setAudioFile(new File([blob], `call-${Date.now()}.${extension}`, { type: actualType.split(";")[0] }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorderRef.current = recorder;
      setSeconds(0);
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was unavailable. You can upload a recording instead.");
    }
  }

  async function sendLiveChunk(blob) {
    if (!blob.size) return;
    liveRequestsRef.current += 1;
    setProcessingChunk(true);
    const form = new FormData();
    const actualType = blob.type || "audio/webm";
    const extension = actualType.includes("mp4") ? "m4a" : "webm";
    form.append("audio", new File([blob], `live-${Date.now()}.${extension}`, { type: actualType.split(";")[0] }));
    form.append("language", language);
    try {
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await response.json();
      if (response.status === 422) {
        emptySegmentsRef.current += 1;
        if (emptySegmentsRef.current >= 2) {
          setNoSpeech(true);
          liveActiveRef.current = false;
          streamRef.current?.getTracks().forEach((track) => track.stop());
          stopMicMeter();
          setRecording(false);
          setStatus("no-speech");
        }
        return;
      }
      if (!response.ok) throw new Error(data.error || "Live transcription failed");
      emptySegmentsRef.current = 0;
      setNoSpeech(false);
      setDetectedLanguage(data.detectedLanguage || language);
      const nextTranscript = `${liveTranscriptRef.current}${liveTranscriptRef.current ? " " : ""}${data.transcript}`.trim();
      liveTranscriptRef.current = nextTranscript;
      setLiveTranscript(nextTranscript);
      // Scan the complete conversation, not only this 5.5-second API chunk.
      // This catches requests whose setup and risky action land in different chunks.
      const cumulativeSafety = fallbackAssessment(nextTranscript);
      if (cumulativeSafety.riskLevel === "high") {
        setLiveWarning(cumulativeSafety);
        triggerCriticalAlert();
        liveActiveRef.current = false;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        stopMicMeter();
        setRecording(false);
        setStatus("live-alert");
      }
    } catch (err) {
      setError(err.message || "Live transcription failed. Try the saved-recording option.");
      liveActiveRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopMicMeter();
      setRecording(false);
      setStatus("idle");
    } finally {
      liveRequestsRef.current = Math.max(0, liveRequestsRef.current - 1);
      setProcessingChunk(liveRequestsRef.current > 0);
    }
  }

  function startMicMeter(stream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frames = 0;
    audioContextRef.current = context;
    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }
      if (frames++ % 5 === 0) setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 420)));
      if (liveActiveRef.current) meterFrameRef.current = requestAnimationFrame(measure);
    };
    measure();
  }

  function stopMicMeter() {
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setMicLevel(0);
  }

  function triggerCriticalAlert() {
    // Vibration is not implemented by every mobile browser. Use a short tone
    // as an additional accessible alert, while the full-screen warning remains
    // the authoritative signal.
    navigator.vibrate?.([250, 120, 450, 120, 450]);
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      [0, 0.32].forEach((delay) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 740;
        gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + 0.24);
      });
      window.setTimeout(() => context.close(), 900);
    } catch {}
  }

  function recordLiveSegment(stream) {
    if (!liveActiveRef.current || !stream.active) return;
    const format = supportedRecordingType();
    const recorder = format.mimeType ? new MediaRecorder(stream, { mimeType: format.mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      const segment = new Blob(chunks, { type: recorder.mimeType || format.mimeType || "audio/webm" });
      // Begin capturing the next segment before the network call so speech is
      // not lost while Saaras processes this one.
      if (liveActiveRef.current) recordLiveSegment(stream);
      await sendLiveChunk(segment);
      if (!liveActiveRef.current) stream.getTracks().forEach((track) => track.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 5500);
  }

  async function startLiveCheck() {
    setError("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    setLiveWarning(null);
    setNoSpeech(false);
    emptySegmentsRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
      streamRef.current = stream;
      liveActiveRef.current = true;
      setLiveMode(true);
      setRecording(true);
      setStatus("live");
      startMicMeter(stream);
      recordLiveSegment(stream);
    } catch {
      setError("माइक्रोफ़ोन शुरू नहीं हुआ। नीचे से सेव रिकॉर्डिंग चुनें।");
    }
  }

  function stopLiveCheck() {
    liveActiveRef.current = false;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    stopMicMeter();
    setStatus("live-stopped");
  }

  function continueFromLive() {
    const confirmedLiveTranscript = liveTranscriptRef.current || liveTranscript;
    if (!confirmedLiveTranscript.trim()) {
      setError("ट्रांसक्रिप्ट तैयार नहीं हुई। कृपया फिर से कोशिश करें।");
      setLiveWarning(null);
      return;
    }
    setTranscript(confirmedLiveTranscript);
    setLiveWarning(null);
    setLiveMode(false);
    setStatus("confirming");
  }

  async function transcribe() {
    if (!audio) return;
    setStatus("transcribing");
    setError("");
    const form = new FormData();
    form.append("audio", audio);
    form.append("language", language);
    form.append("expectedCall", expectedCall);
    try {
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || "Transcription failed");
      setTranscript(data.transcript);
      setDetectedLanguage(data.detectedLanguage || language);
      setStatus("confirming");
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Could not check this call.");
      setStatus("ready");
    }
  }

  async function analyzeConfirmed() {
    if (!transcript.trim()) return;
    setStatus("analyzing");
    setError("");
    try {
      const response = await fetch("/api/analyze-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, language: detectedLanguage || language, expectedCall, sensitiveRequest, pressureUsed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Could not check this call.");
      setStatus("confirming");
    }
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopMicMeter();
    liveTranscriptRef.current = "";
    setAudio(null); setAudioUrl(""); setResult(null); setTranscript(""); setDetectedLanguage(""); setLiveMode(false); setLiveTranscript(""); setLiveWarning(null); setNoSpeech(false); setError(""); setStatus("idle"); setSeconds(0); setExpectedCall("none"); setSensitiveRequest("unsure"); setPressureUsed("unsure");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function shareResult() {
    if (!result) return;
    const text = `Satark — Pehle jaanch, phir action.\nStatus: ${result.assessment.verificationStatus}\n${result.assessment.summary}\n\nSafe next steps:\n${result.assessment.safeNextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Call safety card", text });
      else { await navigator.clipboard.writeText(text); alert("Safety card copied. You can send it to your family."); }
    } catch {}
  }

  const risk = result?.assessment?.riskLevel;
  const riskStyles = risk === "high"
    ? "text-[var(--red)]"
    : risk === "low" ? "text-[#087a54]" : "text-[var(--amber)]";

  return (<>
    {liveWarning && <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[#fff7f6] px-6 py-8 text-center" role="alertdialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--red)] text-white"><Icon name="alert" className="h-10 w-10" /></span>
        <p className="mt-7 text-sm font-bold uppercase tracking-[.18em] text-[var(--red)]">जोखिम भरी माँग मिली</p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.03em]">रुकिए। कुछ साझा न करें।</h2>
        {liveWarning.evidencePhrases?.[0] && <blockquote className="mt-7 border-y border-red-200 py-5 text-xl font-medium leading-8">“{liveWarning.evidencePhrases[0]}”</blockquote>}
        <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-[var(--muted)]">कॉल काटें। OTP, PIN या पैसा साझा न करें। संस्था के आधिकारिक नंबर से खुद जाँच करें।</p>
      </div>
      <div className="mx-auto w-full max-w-lg">
        <button onClick={continueFromLive} className="w-full rounded-full bg-[var(--red)] px-6 py-5 text-lg font-semibold text-white">कॉल काट दी — पूरी जाँच देखें</button>
        <button onClick={reset} className="mt-3 w-full px-5 py-3 font-semibold text-[var(--muted)]">नई जाँच शुरू करें</button>
      </div>
    </div>}
    <main className="mx-auto min-h-screen max-w-xl px-5 py-8 md:py-12">
      <header className="mb-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black text-white"><Icon name="shield" className="h-6 w-6" /></span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.03em]">Satark</h1>
        <p className="mt-1 text-base font-medium text-[var(--muted)]">Pehle jaanch, phir action.</p>
      </header>

      <section>
        <div>
          {!result && !transcript ? <>
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-[-.025em]">लाइव कॉल की जाँच करें</h2>
              <p className="mx-auto mt-3 max-w-sm text-lg leading-7 text-[var(--muted)]">फ़ोन को स्पीकर पर रखें। Satark बातचीत सुनकर जोखिम भरी माँग पर तुरंत रोकेगा।</p>
            </div>

            <div className="mt-10 divide-y divide-black/10 border-y border-black/10">
              <label className="flex items-center justify-between gap-4 py-4 text-base font-medium"><span>भाषा</span><select aria-label="Spoken language" value={language} onChange={(e) => setLanguage(e.target.value)} className="max-w-[55%] bg-transparent py-2 text-right text-base text-[var(--muted)]"><option value="unknown">अपने आप पहचानें</option><option value="hi-IN">हिंदी</option><option value="mr-IN">मराठी</option></select></label>
            </div>

            <div className="mt-9">
              <button onClick={recording && liveMode ? stopLiveCheck : startLiveCheck} className={`flex w-full min-h-20 items-center justify-center gap-3 rounded-full px-6 text-lg font-semibold transition ${recording && liveMode ? "recording-pulse bg-[var(--red)] text-white" : "bg-black text-white hover:bg-neutral-800"}`}>
                <Icon name={recording ? "stop" : "mic"} className="h-6 w-6" />
                {recording && liveMode ? "लाइव जाँच रोकें" : "लाइव जाँच शुरू करें"}
              </button>
              <button disabled={recording && liveMode} onClick={() => fileRef.current?.click()} className="mx-auto mt-5 flex items-center justify-center gap-2 px-4 py-2 font-semibold text-[var(--muted)] hover:text-black disabled:opacity-30">
                <Icon name="upload" className="h-5 w-5" /> या सेव रिकॉर्डिंग चुनें
              </button>
              <input ref={fileRef} className="hidden" type="file" accept="audio/*,.webm,.m4a" onChange={(e) => setAudioFile(e.target.files?.[0])} />
            </div>

            {liveMode && <section className="mt-8" aria-live="polite">
              {liveWarning ? <div className="border-y-2 border-[var(--red)] py-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[.15em] text-[var(--red)]">जोखिम भरी माँग मिली</p>
                <p className="mt-3 text-3xl font-semibold leading-tight">रुकिए। कोई OTP, PIN या पैसा साझा न करें।</p>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">कॉल काटें और संस्था के आधिकारिक नंबर से खुद जाँच करें।</p>
              </div> : noSpeech ? <div className="border-y border-black/15 py-6 text-center">
                <p className="text-2xl font-semibold">आवाज़ साफ़ नहीं मिली</p>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">स्पीकर चालू करें, फ़ोन पास रखें और फिर से कोशिश करें।</p>
                <button onClick={startLiveCheck} className="mt-5 rounded-full bg-black px-6 py-3 font-semibold text-white">फिर से सुनें</button>
              </div> : <div className="flex items-center justify-center gap-3 border-y border-black/10 py-5">
                <span className={`h-3 w-3 rounded-full ${recording ? "bg-[var(--red)] recording-pulse" : "bg-black/25"}`} />
                <p className="font-semibold">{recording ? "Satark सुन रहा है…" : processingChunk ? "आखिरी हिस्सा पढ़ा जा रहा है…" : "लाइव जाँच रुकी हुई है"}</p>
              </div>}

              {recording && <div className="mt-5" aria-label={`Microphone level ${micLevel} percent`}>
                <div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-black transition-[width] duration-100" style={{ width: `${Math.max(3, micLevel)}%` }} /></div>
                <div className="mt-2 flex justify-between text-xs font-medium text-[var(--muted)]"><span>{micLevel > 8 ? "आवाज़ आ रही है" : "थोड़ा पास बोलें"}</span><span>माइक्रोफ़ोन</span></div>
              </div>}

              <div className="py-6">
                <p className="text-sm font-semibold text-[var(--muted)]">लाइव बातचीत</p>
                <p className="mt-3 min-h-20 text-xl leading-8">{liveTranscript || "पहले शब्द कुछ सेकंड में यहाँ दिखाई देंगे…"}</p>
              </div>

              {!recording && liveTranscript && <button disabled={processingChunk} onClick={continueFromLive} className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white disabled:opacity-30">पूरी जाँच देखें <Icon name="arrow" /></button>}
            </section>}

            {audio && !liveMode && <div className="mt-7 border-y border-black/10 py-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">रिकॉर्डिंग तैयार है</p><button onClick={reset} className="text-sm font-semibold text-[var(--muted)]">हटाएँ</button></div><audio className="w-full" src={audioUrl} controls /></div>}
            {error && <p role="alert" className="mt-5 border-l-4 border-[var(--red)] py-2 pl-4 text-sm leading-6 text-[var(--red)]">{error}</p>}
            {audio && !liveMode && <button disabled={status === "transcribing"} onClick={transcribe} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-25">
              {status === "transcribing" ? "कॉल सुनी जा रही है…" : <>आगे बढ़ें <Icon name="arrow" /></>}
            </button>}
            <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-6 text-[var(--muted)]">कॉलर की पहचान साबित नहीं होती। OTP, PIN, CVV या पासवर्ड कभी साझा न करें।</p>
          </> : !result ? <>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">एक बार जाँच लें</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-.025em]">क्या हमने सही सुना?</h2>
            </div>

            <label className="mt-8 block text-sm font-semibold text-[var(--muted)]">बातचीत का टेक्स्ट
              <textarea aria-label="Confirmed transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={6} className="mt-3 w-full resize-y rounded-2xl border border-black/15 bg-white p-4 text-lg leading-8 outline-none focus:border-black" />
            </label>
            <p className="mt-2 text-sm text-[var(--muted)]">गलत शब्द पर टैप करके उसे ठीक करें।</p>

            <div className="mt-9 divide-y divide-black/10 border-y border-black/10">
              <label className="block py-5 text-base font-semibold">क्या इस कॉल की उम्मीद थी?
                <select aria-label="Expected call" value={expectedCall} onChange={(e) => setExpectedCall(e.target.value)} className="mt-3 w-full rounded-xl bg-[var(--soft)] px-4 py-3 text-base"><option value="none">नहीं / पता नहीं</option><option value="bank">हाँ, बैंक</option><option value="pension">हाँ, पेंशन</option><option value="hospital">हाँ, अस्पताल</option><option value="delivery">हाँ, डिलीवरी</option><option value="insurance">हाँ, बीमा</option></select>
              </label>
              <Question label="क्या OTP, PIN, पैसे, दस्तावेज़ या ऐप माँगा गया?" value={sensitiveRequest} onChange={setSensitiveRequest} />
              <Question label="क्या जल्दी करने का दबाव या धमकी दी गई?" value={pressureUsed} onChange={setPressureUsed} />
            </div>

            {error && <p role="alert" className="mt-5 border-l-4 border-[var(--red)] py-2 pl-4 text-sm leading-6 text-[var(--red)]">{error}</p>}
            <button disabled={!transcript.trim() || status === "analyzing"} onClick={analyzeConfirmed} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white disabled:opacity-25">
              {status === "analyzing" ? "सुरक्षित अगला कदम तैयार हो रहा है…" : <>सुरक्षित अगला कदम देखें <Icon name="arrow" /></>}
            </button>
            <button onClick={() => { setTranscript(""); setStatus("ready"); }} className="mx-auto mt-4 block px-4 py-3 font-semibold text-[var(--muted)]">रिकॉर्डिंग बदलें</button>
          </> : <>
            <div className="text-center">
              <p className={`text-sm font-bold uppercase tracking-[.15em] ${riskStyles}`}>{risk === "high" ? "ज़्यादा सावधानी" : risk === "low" ? "कम जोखिम संकेत" : "जाँच ज़रूरी"}</p>
              <h2 className="mx-auto mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-.025em]">{result.assessment.summary}</h2>
            </div>

            <p className="mt-6 border-y border-black/10 py-4 text-center text-sm font-semibold text-[var(--muted)]">कॉलर की पहचान स्वतंत्र रूप से जाँची नहीं गई है</p>

            <div className="mt-7 divide-y divide-black/10 border-b border-black/10">
              <Info title="कॉलर ने कहा" body={result.assessment.callerClaim} />
              <Info title="कॉल का बताया कारण" body={result.assessment.reasonForCall} />
            </div>

            {result.assessment.warningSignals?.length > 0 && <List title="सावधानी के संकेत" items={result.assessment.warningSignals} tone="red" />}
            <List title="अब सुरक्षित रूप से क्या करें" items={result.assessment.safeNextSteps} tone="green" numbered />

            <details className="mt-7 border-y border-black/10 py-4"><summary className="cursor-pointer font-semibold">पूरी बातचीत पढ़ें</summary><p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--muted)]">{result.transcript}</p><p className="mt-3 text-xs text-[var(--muted)]">Detected: {result.detectedLanguage} · Analysis: {result.assessment.analysisMode}</p></details>
            <button onClick={shareResult} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white"><Icon name="share" /> परिवार को भेजें</button>
            <button onClick={reset} className="mx-auto mt-4 flex items-center justify-center gap-2 px-5 py-3 font-semibold text-[var(--muted)]"><Icon name="refresh" /> दूसरी कॉल जाँचें</button>
          </>}
        </div>
      </section>
    </main>
  </>);
}

function Info({ title, body }) { return <div className="py-5"><p className="text-sm font-semibold text-[var(--muted)]">{title}</p><p className="mt-2 text-lg font-medium leading-7">{body || "स्पष्ट नहीं कहा गया"}</p></div>; }
function List({ title, items = [], tone, numbered = false }) { return <section className="mt-8"><h3 className={`text-xl font-semibold ${tone === "red" ? "text-[var(--red)]" : "text-black"}`}>{title}</h3><ol className="mt-4 divide-y divide-black/10 border-y border-black/10">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-4 py-4 text-base leading-7"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${tone === "red" ? "bg-[var(--red-soft)] text-[var(--red)]" : "bg-black text-white"}`}>{numbered ? index + 1 : "!"}</span><span>{item}</span></li>)}</ol></section>; }
function Question({ label, value, onChange }) { return <fieldset className="py-5"><legend className="text-base font-semibold leading-6">{label}</legend><div className="mt-3 grid grid-cols-3 gap-2">{[["yes", "हाँ"], ["no", "नहीं"], ["unsure", "पता नहीं"]].map(([option, text]) => <button type="button" key={option} onClick={() => onChange(option)} aria-pressed={value === option} className={`rounded-full px-3 py-3 text-sm font-semibold ${value === option ? "bg-black text-white" : "bg-[var(--soft)] text-black"}`}>{text}</button>)}</div></fieldset>; }
