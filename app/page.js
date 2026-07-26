"use client";

import { useEffect, useRef, useState } from "react";
import { fallbackAssessment } from "@/lib/safety";

const MAX_SECONDS = 28;

const UI_COPY = {
  "en-IN": {
    tagline: "Pehle jaanch, phir kadam.",
    homeTitle: "Check a suspicious call",
    homeBody: "Put the call on speaker. Satark will warn you before you act.",
    start: "Start listening",
    stop: "Stop listening",
    upload: "Use a saved recording",
    settings: "Settings",
    guidanceLanguage: "App language",
    callLanguage: "Call language",
    autoDetect: "Detect automatically",
    english: "English",
    hindi: "Hindi",
    marathi: "Marathi",
    trustedPhone: "Trusted family number",
    phonePlaceholder: "Phone number",
    save: "Save",
    saved: "Saved on this phone.",
    phoneError: "Enter a valid phone number.",
    install: "Keep Satark on this phone",
    installAction: "Add",
    installHelp: "On iPhone: Safari → Share → Add to Home Screen.",
    installed: "Satark was added to your phone.",
    listening: "Listening…",
    processing: "Checking the last few words…",
    paused: "Listening stopped",
    voiceGood: "Voice is clear",
    voiceLow: "Move closer to the speaker",
    transcript: "View what Satark heard",
    waitingTranscript: "The first words will appear in a few seconds.",
    noSpeechTitle: "We could not hear clearly",
    noSpeechBody: "Turn on speaker, move the phone closer and try again.",
    tryAgain: "Try again",
    fullCheck: "Continue",
    recordingReady: "Recording ready",
    remove: "Remove",
    transcribing: "Listening to the recording…",
    continue: "Continue",
    confirmTitle: "Quick safety check",
    reviewTranscript: "Review transcript",
    transcriptHelp: "Correct any words Satark heard incorrectly.",
    expected: "Were you expecting this call?",
    expectedOptions: ["No / not sure", "Yes, bank", "Yes, pension", "Yes, hospital", "Yes, delivery", "Yes, insurance"],
    sensitive: "Did they ask for a code, money, documents or an app?",
    pressure: "Did they pressure or threaten you?",
    yes: "Yes", no: "No", unsure: "Not sure",
    analyzing: "Preparing a safe next step…",
    getNextStep: "Show safe next step",
    changeRecording: "Change recording",
    riskHigh: "Possible fraud risk",
    riskCaution: "Verify before acting",
    riskLow: "No strong risk signal found",
    resultHigh: "Do not act on this call yet.",
    resultCaution: "Pause and verify the request independently.",
    resultLow: "No strong warning appeared, but the caller is not verified.",
    identityNote: "Satark does not verify the caller’s identity.",
    doThisNow: "Do this now",
    safeSteps: ["End the call.", "Do not share or pay anything.", "Verify through an official number."],
    callFamily: "Contact my family",
    shareFamily: "Send to family",
    details: "View call details",
    callerClaim: "What the caller claimed",
    callReason: "Reason they gave",
    warningSignals: "Warning signals",
    completeTranscript: "Full transcript",
    checkAnother: "Check another call",
    alertLabel: "Possible fraud risk",
    alertTitle: "Stop. End the call.",
    alertBody: "Do not share a code, document or money.",
    alertEvidence: "Why Satark warned you",
    endedCall: "End this call",
    hearAgain: "Hear warning again",
    startOver: "Start over",
    shareTitle: "Satark call safety alert",
    shareCopied: "Safety message copied. Send it to your family.",
    micError: "Microphone could not start. Use a saved recording instead.",
    transcriptError: "The transcript is not ready. Please try again.",
    genericError: "Satark could not check this call. Please try again.",
  },
  "hi-IN": {
    tagline: "पहले जाँच, फिर कदम।", homeTitle: "संदिग्ध कॉल की जाँच करें", homeBody: "फ़ोन को स्पीकर पर रखें। कोई कदम उठाने से पहले सतर्क चेतावनी देगा।", start: "सुनना शुरू करें", stop: "सुनना रोकें", upload: "सेव रिकॉर्डिंग चुनें", settings: "सेटिंग्स", guidanceLanguage: "चेतावनी की भाषा", callLanguage: "कॉल की भाषा", autoDetect: "अपने आप पहचानें", english: "अंग्रेज़ी", hindi: "हिंदी", marathi: "मराठी", trustedPhone: "परिवार का भरोसेमंद नंबर", phonePlaceholder: "फ़ोन नंबर", save: "सहेजें", saved: "इसी फ़ोन पर सहेजा गया।", phoneError: "सही फ़ोन नंबर लिखें।", install: "फ़ोन पर सतर्क रखें", installAction: "जोड़ें", installHelp: "iPhone पर: Safari → Share → Add to Home Screen.", installed: "सतर्क आपके फ़ोन पर जुड़ गया।", listening: "सतर्क सुन रहा है…", processing: "आखिरी शब्द जाँचे जा रहे हैं…", paused: "सुनना रुक गया", voiceGood: "आवाज़ साफ़ है", voiceLow: "स्पीकर के पास रखें", transcript: "सतर्क ने क्या सुना", waitingTranscript: "पहले शब्द कुछ सेकंड में दिखाई देंगे।", noSpeechTitle: "आवाज़ साफ़ नहीं मिली", noSpeechBody: "स्पीकर चालू करें, फ़ोन पास रखें और फिर कोशिश करें।", tryAgain: "फिर कोशिश करें", fullCheck: "आगे बढ़ें", recordingReady: "रिकॉर्डिंग तैयार है", remove: "हटाएँ", transcribing: "रिकॉर्डिंग सुनी जा रही है…", continue: "आगे बढ़ें", confirmTitle: "छोटी सुरक्षा जाँच", reviewTranscript: "बातचीत जाँचें", transcriptHelp: "गलत सुने गए शब्द ठीक करें।", expected: "क्या इस कॉल की उम्मीद थी?", expectedOptions: ["नहीं / पता नहीं", "हाँ, बैंक", "हाँ, पेंशन", "हाँ, अस्पताल", "हाँ, डिलीवरी", "हाँ, बीमा"], sensitive: "क्या गुप्त संख्या, पैसे, दस्तावेज़ या ऐप माँगा गया?", pressure: "क्या जल्दी करने का दबाव या धमकी दी गई?", yes: "हाँ", no: "नहीं", unsure: "पता नहीं", analyzing: "सुरक्षित अगला कदम तैयार हो रहा है…", getNextStep: "सुरक्षित अगला कदम देखें", changeRecording: "रिकॉर्डिंग बदलें", riskHigh: "धोखाधड़ी का खतरा", riskCaution: "पहले जाँच करें", riskLow: "बड़ा जोखिम संकेत नहीं मिला", resultHigh: "अभी इस कॉल पर कोई कदम न उठाएँ।", resultCaution: "रुकें और स्वतंत्र रूप से जाँच करें।", resultLow: "बड़ी चेतावनी नहीं मिली, लेकिन कॉलर की पहचान नहीं हुई।", identityNote: "सतर्क कॉलर की पहचान साबित नहीं करता।", doThisNow: "अभी यह करें", safeSteps: ["कॉल काटें।", "कुछ साझा या भुगतान न करें।", "आधिकारिक नंबर से जाँच करें।"], callFamily: "परिवार से संपर्क करें", shareFamily: "परिवार को भेजें", details: "कॉल की जानकारी देखें", callerClaim: "कॉलर ने क्या दावा किया", callReason: "बताया गया कारण", warningSignals: "सावधानी के संकेत", completeTranscript: "पूरी बातचीत", checkAnother: "दूसरी कॉल जाँचें", alertLabel: "धोखाधड़ी का खतरा", alertTitle: "रुकिए। कॉल काट दीजिए।", alertBody: "कोई गुप्त संख्या, दस्तावेज़ या पैसा साझा न करें।", alertEvidence: "सतर्क ने चेतावनी क्यों दी", endedCall: "कॉल समाप्त करें", hearAgain: "चेतावनी फिर सुनें", startOver: "फिर से शुरू करें", shareTitle: "सतर्क कॉल सुरक्षा चेतावनी", shareCopied: "सुरक्षा संदेश कॉपी हो गया। परिवार को भेजें।", micError: "माइक्रोफ़ोन शुरू नहीं हुआ। सेव रिकॉर्डिंग चुनें।", transcriptError: "बातचीत तैयार नहीं हुई। फिर कोशिश करें।", genericError: "कॉल की जाँच नहीं हो सकी। फिर कोशिश करें।",
  },
  "mr-IN": {
    tagline: "आधी तपासणी, मग कृती।", homeTitle: "संशयास्पद कॉल तपासा", homeBody: "फोन स्पीकरवर ठेवा. कृती करण्यापूर्वी सतर्क इशारा देईल.", start: "ऐकणे सुरू करा", stop: "ऐकणे थांबवा", upload: "जतन केलेले रेकॉर्डिंग निवडा", settings: "सेटिंग्ज", guidanceLanguage: "इशाऱ्याची भाषा", callLanguage: "कॉलची भाषा", autoDetect: "आपोआप ओळखा", english: "इंग्रजी", hindi: "हिंदी", marathi: "मराठी", trustedPhone: "कुटुंबातील विश्वासू क्रमांक", phonePlaceholder: "फोन क्रमांक", save: "जतन करा", saved: "याच फोनवर जतन झाले।", phoneError: "योग्य फोन क्रमांक लिहा।", install: "फोनवर सतर्क ठेवा", installAction: "जोडा", installHelp: "iPhone वर: Safari → Share → Add to Home Screen.", installed: "सतर्क तुमच्या फोनवर जोडले गेले।", listening: "सतर्क ऐकत आहे…", processing: "शेवटचे शब्द तपासत आहे…", paused: "ऐकणे थांबले", voiceGood: "आवाज स्पष्ट आहे", voiceLow: "स्पीकरजवळ ठेवा", transcript: "सतर्कने काय ऐकले", waitingTranscript: "पहिले शब्द काही सेकंदांत दिसतील।", noSpeechTitle: "आवाज स्पष्ट ऐकू आला नाही", noSpeechBody: "स्पीकर चालू करा, फोन जवळ ठेवा आणि पुन्हा प्रयत्न करा।", tryAgain: "पुन्हा प्रयत्न करा", fullCheck: "पुढे जा", recordingReady: "रेकॉर्डिंग तयार आहे", remove: "काढा", transcribing: "रेकॉर्डिंग ऐकत आहे…", continue: "पुढे जा", confirmTitle: "छोटी सुरक्षा तपासणी", reviewTranscript: "संभाषण तपासा", transcriptHelp: "चुकीचे ऐकलेले शब्द दुरुस्त करा।", expected: "हा कॉल अपेक्षित होता का?", expectedOptions: ["नाही / माहीत नाही", "हो, बँक", "हो, पेन्शन", "हो, रुग्णालय", "हो, डिलिव्हरी", "हो, विमा"], sensitive: "गुप्त क्रमांक, पैसे, कागदपत्रे किंवा ॲप मागितले का?", pressure: "घाई किंवा धमकी दिली का?", yes: "हो", no: "नाही", unsure: "माहीत नाही", analyzing: "सुरक्षित पुढील पाऊल तयार होत आहे…", getNextStep: "सुरक्षित पुढील पाऊल पहा", changeRecording: "रेकॉर्डिंग बदला", riskHigh: "फसवणुकीचा धोका", riskCaution: "कृतीपूर्वी तपासा", riskLow: "मोठा धोका दिसला नाही", resultHigh: "या कॉलवर अजून कृती करू नका।", resultCaution: "थांबा आणि स्वतंत्रपणे तपासा।", resultLow: "मोठा इशारा दिसला नाही, पण कॉलरची ओळख पटलेली नाही।", identityNote: "सतर्क कॉलरची ओळख सिद्ध करत नाही।", doThisNow: "आता हे करा", safeSteps: ["कॉल बंद करा।", "काहीही शेअर किंवा पेमेंट करू नका।", "अधिकृत क्रमांकावरून तपासा।"], callFamily: "कुटुंबाला कॉल करा", shareFamily: "कुटुंबाला पाठवा", details: "कॉलची माहिती पहा", callerClaim: "कॉलरने काय सांगितले", callReason: "सांगितलेले कारण", warningSignals: "सावधगिरीचे संकेत", completeTranscript: "पूर्ण संभाषण", checkAnother: "दुसरा कॉल तपासा", alertLabel: "फसवणुकीचा धोका", alertTitle: "थांबा. कॉल बंद करा.", alertBody: "गुप्त क्रमांक, कागदपत्र किंवा पैसे देऊ नका।", alertEvidence: "सतर्कने इशारा का दिला", endedCall: "मी कॉल बंद केला", hearAgain: "इशारा पुन्हा ऐका", startOver: "पुन्हा सुरू करा", shareTitle: "सतर्क कॉल सुरक्षा इशारा", shareCopied: "सुरक्षा संदेश कॉपी झाला. कुटुंबाला पाठवा।", micError: "मायक्रोफोन सुरू झाला नाही. जतन केलेले रेकॉर्डिंग निवडा।", transcriptError: "संभाषण तयार झाले नाही. पुन्हा प्रयत्न करा।", genericError: "कॉल तपासता आला नाही. पुन्हा प्रयत्न करा।",
  },
};

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
    volume: <><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.55-1.03H5.4v-3h.07A1.7 1.7 0 0 0 7.02 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 10.68 5a1.7 1.7 0 0 0 1.03-1.55V3.4h3v.05A1.7 1.7 0 0 0 15.74 5a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1.03H21v3h-.05A1.7 1.7 0 0 0 19.4 15Z"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [language, setLanguage] = useState("unknown");
  const [guidanceLanguage, setGuidanceLanguage] = useState("en-IN");
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
  const [trustedPhone, setTrustedPhone] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [installStatus, setInstallStatus] = useState("");
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
  const warningTriggeredRef = useRef(false);
  const liveSessionRef = useRef(0);
  const ui = UI_COPY[guidanceLanguage] || UI_COPY["en-IN"];

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  useEffect(() => () => {
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("satark-trusted-phone") || "";
    const savedLanguage = window.localStorage.getItem("satark-language");
    const savedGuidanceLanguage = window.localStorage.getItem("satark-guidance-language");
    setTrustedPhone(saved);
    setPhoneDraft(saved);
    if (["unknown", "en-IN", "hi-IN", "mr-IN"].includes(savedLanguage)) setLanguage(savedLanguage);
    if (["en-IN", "hi-IN", "mr-IN"].includes(savedGuidanceLanguage)) setGuidanceLanguage(savedGuidanceLanguage);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const isiPhoneOrIPad = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setShowIosInstall(isiPhoneOrIPad && !standalone);

    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => {
      setInstallPrompt(null);
      setShowIosInstall(false);
      setInstallStatus("installed");
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallStatus("installed");
    setInstallPrompt(null);
  }

  function changeLanguage(value) {
    setLanguage(value);
    window.localStorage.setItem("satark-language", value);
  }

  function changeGuidanceLanguage(value) {
    setGuidanceLanguage(value);
    window.localStorage.setItem("satark-guidance-language", value);
  }

  useEffect(() => {
    if (!recording || liveMode) return;
    const timer = setInterval(() => setSeconds((value) => {
      if (value + 1 >= MAX_SECONDS) recorderRef.current?.stop();
      return value + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [recording, liveMode]);

  function setAudioFile(file) {
    if (!file) return;
    liveSessionRef.current += 1;
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setLiveMode(false);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    setLiveWarning(null);
    warningTriggeredRef.current = false;
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
      setError(ui.micError);
    }
  }

  async function sendLiveChunk(blob, sessionId) {
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
      if (sessionId !== liveSessionRef.current) return;
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
      if (!response.ok) throw new Error(ui.genericError);
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
        showLiveWarning(cumulativeSafety);
      } else {
        // The semantic layer catches paraphrasing, mixed languages and multi-step
        // social engineering that a finite phrase list cannot represent.
        checkSemanticRisk(nextTranscript, sessionId);
      }
    } catch (err) {
      setError(err.message || ui.genericError);
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

  function showLiveWarning(assessment) {
    if (warningTriggeredRef.current) return;
    warningTriggeredRef.current = true;
    setLiveWarning(assessment);
    triggerCriticalAlert();
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopMicMeter();
    setRecording(false);
    setStatus("live-alert");
  }

  function saveTrustedPhone() {
    const normalized = phoneDraft.replace(/[^\d+]/g, "");
    const digits = normalized.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      setError(ui.phoneError);
      setPhoneSaved(false);
      return;
    }
    window.localStorage.setItem("satark-trusted-phone", normalized);
    setTrustedPhone(normalized);
    setPhoneDraft(normalized);
    setPhoneSaved(true);
    setError("");
  }

  async function checkSemanticRisk(currentTranscript, sessionId) {
    try {
      const response = await fetch("/api/analyze-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: currentTranscript }),
      });
      if (!response.ok || warningTriggeredRef.current || sessionId !== liveSessionRef.current) return;
      const assessment = await response.json();
      if (assessment.riskLevel === "high") showLiveWarning(assessment);
    } catch {
      // Live transcription and the on-device rules continue if this optional
      // semantic layer is temporarily unavailable.
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

  function recordLiveSegment(stream, sessionId) {
    if (!liveActiveRef.current || !stream.active) return;
    const format = supportedRecordingType();
    const recorder = format.mimeType ? new MediaRecorder(stream, { mimeType: format.mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      const segment = new Blob(chunks, { type: recorder.mimeType || format.mimeType || "audio/webm" });
      // Begin capturing the next segment before the network call so speech is
      // not lost while Saaras processes this one.
      if (liveActiveRef.current && sessionId === liveSessionRef.current) recordLiveSegment(stream, sessionId);
      await sendLiveChunk(segment, sessionId);
      if (!liveActiveRef.current) stream.getTracks().forEach((track) => track.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 5500);
  }

  async function startLiveCheck() {
    const sessionId = liveSessionRef.current + 1;
    liveSessionRef.current = sessionId;
    setError("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    setLiveWarning(null);
    warningTriggeredRef.current = false;
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
      recordLiveSegment(stream, sessionId);
    } catch {
      setError(ui.micError);
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
      setError(ui.transcriptError);
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
      if (!response.ok) throw new Error(ui.genericError);
      setTranscript(data.transcript);
      setDetectedLanguage(data.detectedLanguage || language);
      setStatus("confirming");
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : ui.genericError);
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
        body: JSON.stringify({ transcript, language: guidanceLanguage, expectedCall, sensitiveRequest, pressureUsed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(ui.genericError);
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : ui.genericError);
      setStatus("confirming");
    }
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    liveActiveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopMicMeter();
    liveSessionRef.current += 1;
    liveTranscriptRef.current = "";
    warningTriggeredRef.current = false;
    setAudio(null); setAudioUrl(""); setResult(null); setTranscript(""); setDetectedLanguage(""); setLiveMode(false); setLiveTranscript(""); setLiveWarning(null); setNoSpeech(false); setError(""); setStatus("idle"); setSeconds(0); setExpectedCall("none"); setSensitiveRequest("unsure"); setPressureUsed("unsure");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function shareResult() {
    if (!result) return;
    const resultTitle = risk === "high" ? ui.resultHigh : risk === "low" ? ui.resultLow : ui.resultCaution;
    const text = `Satark — ${ui.tagline}\n${resultTitle}\n${ui.identityNote}\n\n${ui.doThisNow}:\n${ui.safeSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: ui.shareTitle, text });
      else { await navigator.clipboard.writeText(text); alert(ui.shareCopied); }
    } catch {}
  }

  const risk = result?.assessment?.riskLevel;
  const riskStyles = risk === "high"
    ? "text-[var(--red)]"
    : risk === "low" ? "text-[#087a54]" : "text-[var(--amber)]";
  const resultLabel = risk === "high" ? ui.riskHigh : risk === "low" ? ui.riskLow : ui.riskCaution;
  const resultTitle = risk === "high" ? ui.resultHigh : risk === "low" ? ui.resultLow : ui.resultCaution;
  const expectedValues = ["none", "bank", "pension", "hospital", "delivery", "insurance"];
  const answers = [["yes", ui.yes], ["no", ui.no], ["unsure", ui.unsure]];

  return (<>
    {liveWarning && <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#fff7f6] text-center" role="alertdialog" aria-modal="true" aria-labelledby="live-alert-title">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-5 sm:py-8">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--red)] text-white"><Icon name="alert" className="h-8 w-8" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[var(--red)]">{ui.alertLabel}</p>
          <h2 id="live-alert-title" className="mt-3 text-4xl font-semibold leading-[1.08] tracking-[-.035em]">{ui.alertTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-7 text-[var(--muted)]">{ui.alertBody}</p>
          {liveWarning.evidencePhrases?.length > 0 && <details className="mt-5 border-y border-red-200 py-3 text-left">
            <summary className="cursor-pointer text-center font-semibold text-[var(--red)]">{ui.alertEvidence}</summary>
            <p className="mt-3 text-center text-base leading-7">“{liveWarning.evidencePhrases[0]}”</p>
          </details>}
        </div>
        <div className="mt-auto pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={continueFromLive} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--red)] px-6 py-4 text-lg font-semibold text-white">{ui.endedCall}</button>
          {trustedPhone
            ? <a href={`tel:${trustedPhone}`} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-4 font-semibold text-white"><Icon name="phone" /> {ui.callFamily}</a>
            : <button type="button" disabled className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-4 font-semibold text-white opacity-35"><Icon name="phone" /> {ui.callFamily}</button>}
        </div>
      </div>
    </div>}
    <main className="mx-auto min-h-screen max-w-xl px-5 py-7 md:py-11" aria-hidden={liveWarning ? "true" : undefined}>
      <header className="relative mb-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black text-white"><Icon name="shield" className="h-6 w-6" /></span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.035em]">Satark</h1>
        <p className="mt-1 text-base font-medium text-[var(--muted)]">{ui.tagline}</p>
        {!liveMode && !result && !transcript && <details className="absolute right-0 top-0 z-40 text-left">
          <summary aria-label={ui.settings} title={ui.settings} className="grid h-12 w-12 cursor-pointer list-none place-items-center rounded-full border border-black/10 bg-white text-black shadow-sm [&::-webkit-details-marker]:hidden"><Icon name="settings" className="h-5 w-5" /></summary>
          <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{ui.settings}</h2>
            <div className="mt-3 divide-y divide-black/10">
              <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium"><span>{ui.guidanceLanguage}</span><select aria-label={ui.guidanceLanguage} value={guidanceLanguage} onChange={(e) => changeGuidanceLanguage(e.target.value)} className="max-w-[55%] bg-transparent py-2 text-right text-sm text-[var(--muted)]"><option value="en-IN">{ui.english}</option><option value="hi-IN">{ui.hindi}</option><option value="mr-IN">{ui.marathi}</option></select></label>
              <label className="flex items-center justify-between gap-4 py-4 text-sm font-medium"><span>{ui.callLanguage}</span><select aria-label={ui.callLanguage} value={language} onChange={(e) => changeLanguage(e.target.value)} className="max-w-[55%] bg-transparent py-2 text-right text-sm text-[var(--muted)]"><option value="unknown">{ui.autoDetect}</option><option value="en-IN">{ui.english}</option><option value="hi-IN">{ui.hindi}</option><option value="mr-IN">{ui.marathi}</option></select></label>
              <div className="py-4">
                <label className="text-sm font-medium" htmlFor="trusted-phone">{ui.trustedPhone}</label>
                <div className="mt-3 flex gap-2">
                  <input id="trusted-phone" inputMode="tel" autoComplete="tel" value={phoneDraft} onChange={(event) => { setPhoneDraft(event.target.value); setPhoneSaved(false); }} placeholder={ui.phonePlaceholder} className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-4 outline-none focus:border-black" />
                  <button type="button" onClick={saveTrustedPhone} className="min-h-12 rounded-xl bg-black px-4 font-semibold text-white">{ui.save}</button>
                </div>
                {phoneSaved && <p className="mt-2 text-sm font-semibold text-[#087a54]" role="status">{ui.saved}</p>}
              </div>
            </div>
          </div>
        </details>}
      </header>

      <section>
        <div>
          {!result && !transcript ? <>
            {!liveMode && <><div className="text-center">
              <h2 className="text-3xl font-semibold tracking-[-.03em]">{ui.homeTitle}</h2>
              <p className="mx-auto mt-3 max-w-sm text-lg leading-7 text-[var(--muted)]">{ui.homeBody}</p>
            </div>

            </>}

            <div className="mt-9">
              <button onClick={recording && liveMode ? stopLiveCheck : startLiveCheck} className={`flex w-full min-h-20 items-center justify-center gap-3 rounded-full px-6 text-lg font-semibold transition ${recording && liveMode ? "recording-pulse bg-[var(--red)] text-white" : "bg-black text-white hover:bg-neutral-800"}`}>
                <Icon name={recording ? "stop" : "mic"} className="h-6 w-6" />
                {recording && liveMode ? ui.stop : ui.start}
              </button>
              <button disabled={recording && liveMode} onClick={() => fileRef.current?.click()} className="mx-auto mt-5 flex items-center justify-center gap-2 px-4 py-2 font-semibold text-[var(--muted)] hover:text-black disabled:opacity-30">
                <Icon name="upload" className="h-5 w-5" /> {ui.upload}
              </button>
              <input ref={fileRef} className="hidden" type="file" accept="audio/*,.webm,.m4a" onChange={(e) => setAudioFile(e.target.files?.[0])} />
            </div>

            {liveMode && <section className="mt-8" aria-live="polite">
              {liveWarning ? <div className="border-y-2 border-[var(--red)] py-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[.15em] text-[var(--red)]">{ui.alertLabel}</p>
                <p className="mt-3 text-3xl font-semibold leading-tight">{ui.alertTitle}</p>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">{ui.alertBody}</p>
              </div> : noSpeech ? <div className="border-y border-black/15 py-6 text-center">
                <p className="text-2xl font-semibold">{ui.noSpeechTitle}</p>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">{ui.noSpeechBody}</p>
                <button onClick={startLiveCheck} className="mt-5 min-h-12 rounded-full bg-black px-6 py-3 font-semibold text-white">{ui.tryAgain}</button>
              </div> : <div className="flex items-center justify-center gap-3 border-y border-black/10 py-5">
                <span className={`h-3 w-3 rounded-full ${recording ? "bg-[var(--red)] recording-pulse" : "bg-black/25"}`} />
                <p className="font-semibold">{recording ? ui.listening : processingChunk ? ui.processing : ui.paused}</p>
              </div>}

              {recording && <div className="mt-5" aria-label={`Microphone level ${micLevel}%`}>
                <div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-black transition-[width] duration-100" style={{ width: `${Math.max(3, micLevel)}%` }} /></div>
                <p className="mt-2 text-center text-xs font-medium text-[var(--muted)]">{micLevel > 8 ? ui.voiceGood : ui.voiceLow}</p>
              </div>}

              <div className="my-6 border-y border-black/10 py-5" aria-live="polite">
                <p className="text-sm font-semibold text-[var(--muted)]">{ui.transcript}</p>
                <p className={`mt-3 min-h-20 whitespace-pre-wrap text-xl leading-8 ${liveTranscript ? "text-black" : "text-[var(--muted)]"}`}>{liveTranscript || ui.waitingTranscript}</p>
              </div>

              {!recording && liveTranscript && <button disabled={processingChunk} onClick={continueFromLive} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-4 text-lg font-semibold text-white disabled:opacity-30">{ui.fullCheck} <Icon name="arrow" /></button>}
            </section>}

            {audio && !liveMode && <div className="mt-7 border-y border-black/10 py-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">{ui.recordingReady}</p><button onClick={reset} className="text-sm font-semibold text-[var(--muted)]">{ui.remove}</button></div><audio className="w-full" src={audioUrl} controls /></div>}
            {error && <p role="alert" className="mt-5 border-l-4 border-[var(--red)] py-2 pl-4 text-sm leading-6 text-[var(--red)]">{error}</p>}
            {audio && !liveMode && <button disabled={status === "transcribing"} onClick={transcribe} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-25">
              {status === "transcribing" ? ui.transcribing : <>{ui.continue} <Icon name="arrow" /></>}
            </button>}
          </> : !result ? <>
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-[-.03em]">{ui.confirmTitle}</h2>
            </div>

            <details className="mt-7 border-y border-black/10 py-4">
              <summary className="cursor-pointer font-semibold">{ui.reviewTranscript}</summary>
              <textarea aria-label={ui.reviewTranscript} value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={6} className="mt-4 w-full resize-y rounded-2xl border border-black/15 bg-white p-4 text-lg leading-8 outline-none focus:border-black" />
              <p className="mt-2 text-sm text-[var(--muted)]">{ui.transcriptHelp}</p>
            </details>

            <div className="mt-5 divide-y divide-black/10 border-b border-black/10">
              <label className="block py-5 text-base font-semibold">{ui.expected}
                <select aria-label={ui.expected} value={expectedCall} onChange={(e) => setExpectedCall(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl bg-[var(--soft)] px-4 text-base">{expectedValues.map((value, index) => <option key={value} value={value}>{ui.expectedOptions[index]}</option>)}</select>
              </label>
              <Question label={ui.sensitive} value={sensitiveRequest} onChange={setSensitiveRequest} answers={answers} />
              <Question label={ui.pressure} value={pressureUsed} onChange={setPressureUsed} answers={answers} />
            </div>

            {error && <p role="alert" className="mt-5 border-l-4 border-[var(--red)] py-2 pl-4 text-sm leading-6 text-[var(--red)]">{error}</p>}
            <button disabled={!transcript.trim() || status === "analyzing"} onClick={analyzeConfirmed} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-5 text-lg font-semibold text-white disabled:opacity-25">
              {status === "analyzing" ? ui.analyzing : <>{ui.getNextStep} <Icon name="arrow" /></>}
            </button>
            <button onClick={() => { setTranscript(""); setStatus("ready"); }} className="mx-auto mt-4 block min-h-12 px-4 py-3 font-semibold text-[var(--muted)]">{ui.changeRecording}</button>
          </> : <>
            <div className="text-center">
              <p className={`text-sm font-bold uppercase tracking-[.13em] ${riskStyles}`}>{resultLabel}</p>
              <h2 className="mx-auto mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-.03em]">{resultTitle}</h2>
            </div>

            <p className="mt-5 text-center text-sm font-semibold text-[var(--muted)]">{ui.identityNote}</p>

            <List title={ui.doThisNow} items={ui.safeSteps} tone="green" numbered />

            {trustedPhone && <a href={`tel:${trustedPhone}`} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-black px-5 font-semibold text-white"><Icon name="phone" /> {ui.callFamily}</a>}
            <button onClick={shareResult} className={`${trustedPhone ? "mt-3" : "mt-8"} flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 font-semibold`}><Icon name="share" /> {ui.shareFamily}</button>

            <details className="mt-7 border-y border-black/10 py-4"><summary className="cursor-pointer font-semibold">{ui.details}</summary><div className="mt-3 divide-y divide-black/10"><Info title={ui.callerClaim} body={result.assessment.callerClaim} /><Info title={ui.callReason} body={result.assessment.reasonForCall} />{result.assessment.warningSignals?.length > 0 && <Info title={ui.warningSignals} body={result.assessment.warningSignals.join(" · ")} />}<Info title={ui.completeTranscript} body={result.transcript} /></div></details>
            <button onClick={reset} className="mx-auto mt-4 flex min-h-12 items-center justify-center gap-2 px-5 py-3 font-semibold text-[var(--muted)]"><Icon name="refresh" /> {ui.checkAnother}</button>
          </>}
        </div>
      </section>
    </main>
  </>);
}

function Info({ title, body }) { return <div className="py-4"><p className="text-sm font-semibold text-[var(--muted)]">{title}</p><p className="mt-2 whitespace-pre-wrap text-base leading-7">{body || "—"}</p></div>; }
function List({ title, items = [], tone, numbered = false }) { return <section className="mt-8"><h3 className={`text-xl font-semibold ${tone === "red" ? "text-[var(--red)]" : "text-black"}`}>{title}</h3><ol className="mt-4 divide-y divide-black/10 border-y border-black/10">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-4 py-4 text-base leading-7"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${tone === "red" ? "bg-[var(--red-soft)] text-[var(--red)]" : "bg-black text-white"}`}>{numbered ? index + 1 : "!"}</span><span>{item}</span></li>)}</ol></section>; }
function Question({ label, value, onChange, answers }) { return <fieldset className="py-5"><legend className="text-base font-semibold leading-6">{label}</legend><div className="mt-3 grid grid-cols-3 gap-2">{answers.map(([option, text]) => <button type="button" key={option} onClick={() => onChange(option)} aria-pressed={value === option} className={`min-h-12 rounded-full px-3 py-3 text-sm font-semibold ${value === option ? "bg-black text-white" : "bg-[var(--soft)] text-black"}`}>{text}</button>)}</div></fieldset>; }
