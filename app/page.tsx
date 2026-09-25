"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { TerminalPanel } from "./components/TerminalPanel";

const Avatar3D = dynamic(() => import("./components/Avatar3D").then(mod => mod.Avatar3D), {
  ssr: false,
  loading: () => <div className="avatar3d-loading">LOADING 3D FACE...</div>
});

type Message = { role: "user" | "assistant"; content: string };

const starter: Message[] = [
  { role: "assistant", content: "Hey. I’m here. This is ZeroTwo AI Studio." }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zt-live-messages");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("zt-live-messages", JSON.stringify(messages));
  }, [messages]);

  async function speak(text: string) {
    if (!voiceEnabled) return;
    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error("Cloud voice is unavailable.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      await audio.play();
    } catch {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 1.08;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(false);
      }
    }
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput("Voice input is not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.start();
    recognitionRef.current = recognition;
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, provider })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      const answer = data.text || "I didn't get a response.";
      setMessages(current => [...current, { role: "assistant", content: answer }]);
      void speak(answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages(current => [...current, { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages(starter);
    localStorage.removeItem("zt-live-messages");
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  const avatarState = speaking ? "speaking" : busy ? "thinking" : listening ? "listening" : "idle";

  return (
    <main className="studio">
      <header className="topbar">
        <div>
          <div className="brand">ZEROTWO <span>AI STUDIO</span></div>
          <div className="subtitle">Live 3D companion workspace</div>
        </div>
        <div className="top-actions">
          <span className="gpu-badge"><i /> AI ONLINE</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="AI provider">
            <option value="auto">Auto AI</option>
            <option value="openai">ChatGPT / OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "Voice ON" : "Voice OFF"}</button>
          <button onClick={() => setSettingsOpen(v => !v)}>Settings</button>
          <button onClick={clearChat}>Clear</button>
        </div>
      </header>

      <div className="workspace single-workspace">
        <section className="companion-panel">
          <div className="panel-title"><span>01</span> LIVE COMPANION</div>
          <div className="character-wrap">
            <div className="aura" />
            <div className="character-card avatar-card">
              <Avatar3D state={avatarState} />
            </div>
          </div>
          <h1>Zero Two</h1>
          <p className="presence">
            {speaking ? "Speaking..." : busy ? "Thinking..." : listening ? "Listening..." : "Ready to talk"}
          </p>

          <div className="live-controls">
            <button className={listening ? "live-button active" : "live-button"} onClick={startListening}>
              {listening ? "Listening..." : "Start talking"}
            </button>
          </div>

          <div className="chat-messages">
            {messages.slice(-8).map((message, index) => (
              <div key={index} className={message.role === "user" ? "mini-message user" : "mini-message"}>
                <b>{message.role === "user" ? "YOU" : "ZERO TWO"}</b>
                <span>{message.content}</span>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="composer">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "Listening..." : "Say something..."} />
            <button className="send" disabled={busy || !input.trim()}>Send</button>
          </form>
        </section>
      </div>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <section className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <div>
                <div className="settings-kicker">CONTROL PANEL</div>
                <h2>Settings</h2>
              </div>
              <button onClick={() => setSettingsOpen(false)}>Close</button>
            </div>

            <div className="settings-section">
              <div className="setting-row">
                <div>
                  <strong>AI Provider</strong>
                  <span>Choose which configured model handles chat.</span>
                </div>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="openai">ChatGPT / OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Voice</strong>
                  <span>Use cloud GPU voice when configured, with browser fallback.</span>
                </div>
                <button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "Enabled" : "Disabled"}</button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>3D Companion</strong>
                  <span>Interactive face, blinking, head tracking, and speaking animation are enabled.</span>
                </div>
                <span className="status-pill">LIVE</span>
              </div>
              <div className="setting-row terminal-setting">
                <div>
                  <strong>Developer Terminal</strong>
                  <span>Hidden by default. Open it only when you need backend workspace access.</span>
                </div>
                <button onClick={() => setTerminalOpen(v => !v)}>{terminalOpen ? "Hide Terminal" : "Show Terminal"}</button>
              </div>
            </div>

            {terminalOpen && (
              <div className="terminal-drawer">
                <div className="terminal-drawer-title">Developer Terminal</div>
                <TerminalPanel />
              </div>
            )}

            <div className="settings-note">
              API keys stay server-side. Never put an OpenAI key in frontend code, GitHub files, or a NEXT_PUBLIC_* variable.
            </div>
          </section>
        </div>
      )}

      <footer>
        <span>ZEROTWO AI STUDIO</span>
        <span>3D Face + AI Chat + Voice</span>
      </footer>
    </main>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
