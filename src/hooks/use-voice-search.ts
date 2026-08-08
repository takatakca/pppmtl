import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/data/menu";

type VoiceStatus = "idle" | "listening" | "processing" | "denied" | "unsupported" | "error";

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    (new () => SpeechRecognitionLike) | null;
}

export function useVoiceSearch(lang: Lang, onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = lang === "fr" ? "fr-CA" : "en-CA";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
        setTranscript(text.trim());
        if (event.results[event.results.length - 1].isFinal) {
          setStatus("processing");
          callbackRef.current(text.trim());
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorLike) => {
        setStatus(
          event?.error === "not-allowed" || event?.error === "service-not-allowed"
            ? "denied"
            : "error",
        );
      };
      recognition.onend = () => {
        setStatus((s) => (s === "listening" ? "idle" : s));
      };
      recognitionRef.current = recognition;
      setTranscript("");
      setStatus("listening");
      recognition.start();
    } catch {
      setStatus("error");
    }
  }, [lang]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const reset = useCallback(() => {
    setTranscript("");
    setStatus("idle");
  }, []);

  return { status, transcript, supported, start, stop, reset };
}
