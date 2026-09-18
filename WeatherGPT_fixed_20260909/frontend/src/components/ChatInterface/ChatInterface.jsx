import React, { useEffect, useRef, useState } from "react";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, options);
  } catch {
    throw new Error("Voice service is unavailable. Please check the backend.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "The voice service could not complete the request."
    );
  }
  return data;
}

export default function ChatInterface({ onSend, language = "auto" }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me about weather, forecasts, rain, temperature or travel.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceState, setVoiceState] = useState("ready");

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const speakControllerRef = useRef(null);
  const voiceRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      } catch {}
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      audioRef.current?.pause?.();
      if (speakControllerRef.current) speakControllerRef.current.abort();
    };
  }, []);

  function stopCurrentAudio() {
    if (speakControllerRef.current) {
      speakControllerRef.current.abort();
      speakControllerRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
  }

  async function speak(text) {
    const value = String(text || "").trim();
    if (!value) return;

    if (!("speechSynthesis" in window)) {
      setMessages((items) => [
        ...items,
        {
          role: "system",
          text: "Voice playback is not supported in this browser.",
        },
      ]);
      return;
    }

    window.speechSynthesis.cancel();
    setVoiceState("speaking");

    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang =
      language === "hi" || language === "hindi"
        ? "hi-IN"
        : language === "mr" || language === "marathi"
          ? "mr-IN"
          : "en-IN";
    utterance.onend = () => setVoiceState("ready");
    utterance.onerror = () => setVoiceState("ready");
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(text, speakReply = false) {
    const value = String(text || "").trim();
    if (!value || busy) return;

    setMessages((items) => [...items, { role: "user", text: value }]);
    setInput("");
    setBusy(true);
    setVoiceState(speakReply ? "thinking" : "ready");

    try {
      const reply = await onSend(value);
      const replyText = String(reply || "I could not get a weather answer right now.").trim();
      setMessages((items) => [...items, { role: "assistant", text: replyText }]);
      if (speakReply) {
        await speak(replyText);
      }
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          role: "system",
          text: error?.message || "I could not complete that weather request.",
        },
      ]);
      setVoiceState("ready");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    await sendMessage(input, false);
  }

  function chooseMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return "audio/webm;codecs=opus";
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    return "";
  }

  async function startVoice() {
    if (busy || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessages((items) => [
        ...items,
        {
          role: "system",
          text: "Voice recording is not supported in this browser. Please use the latest Chrome or Edge.",
        },
      ]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = chooseMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      setRecording(true);
      setVoiceState("listening");

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setVoiceState("ready");
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setVoiceState("thinking");

        const requestId = ++voiceRequestRef.current;
        try {
          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });
          if (!blob.size) throw new Error("No voice recording was received.");

          const form = new FormData();
          form.append("audio", blob, "weather-gpt.webm");
          form.append("language", language || "auto");

          const data = await apiFetch("/api/voice/transcribe", {
            method: "POST",
            body: form,
          });

          if (requestId !== voiceRequestRef.current) return;

          const transcript = String(data.text || "").trim();
          if (!transcript) throw new Error("I could not hear a clear question.");

          setInput(transcript);
          await sendMessage(transcript, true);
        } catch (error) {
          if (requestId === voiceRequestRef.current) {
            setMessages((items) => [
              ...items,
              {
                role: "system",
                text: error?.message || "Voice recognition is temporarily unavailable.",
              },
            ]);
            setVoiceState("ready");
          }
        }
      };

      recorder.start();
    } catch (error) {
      setRecording(false);
      setVoiceState("ready");
      setMessages((items) => [
        ...items,
        {
          role: "system",
          text:
            error?.name === "NotAllowedError"
              ? "Microphone permission was denied. Please allow microphone access."
              : "Unable to start voice recording.",
        },
      ]);
    }
  }

  function stopVoice() {
    try {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    } catch {
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      setRecording(false);
      setVoiceState("ready");
    }
  }

  const statusLabel =
    voiceState === "listening"
      ? "Listening"
      : voiceState === "thinking"
        ? "Thinking"
        : voiceState === "speaking"
          ? "Speaking"
          : "Ready";

  return (
    <section className="panel">
      <div className="title-row">
        <div>
          <span className="kicker">AI Assistant</span>
          <h2>Weather Chat</h2>
        </div>
        <span className={`voice-status ${voiceState}`}>{statusLabel}</span>
      </div>

      <div className="chat-box">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.text}</span>
            {message.role === "assistant" && (
              <button
                className="small-btn"
                type="button"
                onClick={() => speak(message.text)}
                disabled={busy}
                title="Speak this answer"
              >
                🔊
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="voice-hint">
        {recording
          ? "Recording… tap the microphone again to stop."
          : "Speak in English, Hindi, Marathi or Hinglish."}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <button
          type="button"
          className={`mic-btn ${recording ? "recording" : ""}`}
          onClick={recording ? stopVoice : startVoice}
          disabled={busy}
          title={recording ? "Stop recording" : "Start voice input"}
        >
          {recording ? "■" : "🎙️"}
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. kal Mumbai mein baarish hogi?"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
