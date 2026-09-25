"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { TerminalPanel } from "./components/TerminalPanel";

const Avatar3D = dynamic(() => import("./components/Avatar3D").then(mod => mod.Avatar3D), {
  ssr: false,
  loading: () => <div className="avatar3d-loading">LOADING 3D FACE...</div>
});

type Message = { role: "user" | "assistant"; content: string };
type Theme = "midnight" | "black" | "plum";

const starter: Message[] = [
  { role: "assistant", content: "Hey. I’m here." }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("auto");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [listening, setListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "ai" | "appearance">("general");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("midnight");
  const [textColor, setTextColor] = useState("#f5f5f7");
  const [language, setLanguage] = useState("en-US");
  const [enterToSend, setEnterToSend] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("zt-live-messages");
    if (savedMessages) setMessages(JSON.parse(savedMessages));

    const savedTheme = localStorage.getItem("zt-theme") as Theme | null;
    if (savedTheme) setTheme(savedTheme);

    const savedTextColor = localStorage.getItem("zt-text-color");
    if (savedTextColor) setTextColor(savedTextColor);

    const savedProvider = localStorage.getItem("zt-provider");
    if (savedProvider) setProvider(savedProvider);

    const savedModel = localStorage.getItem("zt-model");
    if (savedModel) setModel(savedModel);

    const savedVoice = localStorage.getItem("zt-voice");
    if (savedVoice !== null) setVoiceEnabled(savedVoice === "true");

    const savedAutoSpeak = localStorage.getItem("zt-auto-speak");
    if (savedAutoSpeak !== null) setAutoSpeak(savedAutoSpeak === "true");

    const savedLanguage = localStorage.getItem("zt-language");
    if (savedLanguage) setLanguage(savedLanguage);

    const savedEnter = localStorage.getItem("zt-enter-send");
    if (savedEnter !== null) setEnterToSend(savedEnter === "true");

    try {
      const temporaryKey = sessionStorage.getItem("zt-api-key");
      if (temporaryKey) setApiKey(temporaryKey);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("zt-live-messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("zt-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("zt-text-color", textColor);
    document.documentElement.style.setProperty("--user-text", textColor);
  }, [textColor]);

  function saveApiSettings() {
    localStorage.setItem("zt-provider", provider);
    localStorage.setItem("zt-model", model);
    try {
      if (apiKey.trim()) sessionStorage.setItem("zt-api-key", apiKey.trim());
      else sessionStorage.removeItem("zt-api-key");
    } catch {}
  }

  async function speak(text: string) {
    if (!voiceEnabled || !autoSpeak) return;
    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error("Cloud voice unavailable");
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
        utterance.lang = language;
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
    recognition.lang = language;
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
        body: JSON.stringify({ messages: nextMessages, provider, model, apiKey: apiKey.trim() })
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

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (enterToSend && event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
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
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">ZT</div>
          <span>ZeroTwo</span>
        </div>

        <button className="new-chat" onClick={clearChat}>
          <span>＋</span>
          New chat
        </button>

        <nav className="sidebar-nav">
          <button className="side-item active"><span>⌂</span> Companion</button>
          <button className="side-item" onClick={() => { setSettingsTab("ai"); setSettingsOpen(true); }}><span>✦</span> AI</button>
          <button className="side-item" onClick={() => { setSettingsTab("appearance"); setSettingsOpen(true); }}><span>◈</span> Appearance</button>
        </nav>

        <div className="sidebar-spacer" />

        <button className="side-item settings-item" onClick={() => { setSettingsTab("general"); setSettingsOpen(true); }}>
          <span>⚙</span>
          Settings
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">Z</div>
          <div>
            <strong>ZeroTwo AI</strong>
            <span>Live companion</span>
          </div>
        </div>
      </aside>

      <section className="main-shell">
        <header className="compact-bar">
          <div className="status"><i /> AI ONLINE</div>
          <div className="compact-actions">
            <button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "Voice ON" : "Voice OFF"}</button>
            <button onClick={() => setSettingsOpen(true)}>Settings</button>
          </div>
        </header>

        <div className="companion-stage">
          <div className="panel-title"><span>LIVE</span> COMPANION</div>

          <div className="character-wrap">
            <div className="aura" />
            <div className="character-card avatar-card">
              <Avatar3D state={avatarState} />
            </div>
          </div>

          <div className="presence-dot">
            <i />
            {speaking ? "Speaking" : busy ? "Thinking" : listening ? "Listening" : "Ready"}
          </div>

          <div className="chat-messages">
            {messages.slice(-8).map((message, index) => (
              <div key={index} className={message.role === "user" ? "mini-message user" : "mini-message"}>
                <b>{message.role === "user" ? "YOU" : "ZERO TWO"}</b>
                <span>{message.content}</span>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            <button onClick={startListening}>{listening ? "Listening..." : "Talk"}</button>
            <button onClick={() => setAutoSpeak(v => !v)}>{autoSpeak ? "Auto voice ON" : "Auto voice OFF"}</button>
            <button onClick={clearChat}>New chat</button>
          </div>

          <form onSubmit={sendMessage} className="composer">
            <button type="button" className="mic-button" onClick={startListening}>◉</button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={listening ? "Listening..." : "Message ZeroTwo..."}
            />
            <button className="send" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      </section>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <section className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-sidebar">
              <div className="settings-mini-brand">SETTINGS</div>
              <button className={settingsTab === "general" ? "settings-tab active" : "settings-tab"} onClick={() => setSettingsTab("general")}>General</button>
              <button className={settingsTab === "ai" ? "settings-tab active" : "settings-tab"} onClick={() => setSettingsTab("ai")}>AI & API</button>
              <button className={settingsTab === "appearance" ? "settings-tab active" : "settings-tab"} onClick={() => setSettingsTab("appearance")}>Appearance</button>
              <button className="settings-tab" onClick={() => { setTerminalOpen(v => !v); setSettingsTab("general"); }}>{terminalOpen ? "Hide terminal" : "Developer terminal"}</button>
              <button className="settings-close" onClick={() => setSettingsOpen(false)}>Close</button>
            </div>

            <div className="settings-content">
              {settingsTab === "general" && (
                <>
                  <div className="settings-section-title">General</div>
                  <div className="settings-control">
                    <div><strong>Voice</strong><span>Turn all voice output on or off.</span></div>
                    <button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "ON" : "OFF"}</button>
                  </div>
                  <div className="settings-control">
                    <div><strong>Auto voice</strong><span>Speak every AI reply automatically.</span></div>
                    <button onClick={() => setAutoSpeak(v => !v)}>{autoSpeak ? "ON" : "OFF"}</button>
                  </div>
                  <div className="settings-control">
                    <div><strong>Enter to send</strong><span>Press Enter to send your message.</span></div>
                    <button onClick={() => setEnterToSend(v => !v)}>{enterToSend ? "ON" : "OFF"}</button>
                  </div>
                  <div className="settings-control">
                    <div><strong>Language</strong><span>Used for microphone recognition and browser voice fallback.</span></div>
                    <select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem("zt-language", e.target.value); }}>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="ja-JP">Japanese</option>
                      <option value="ko-KR">Korean</option>
                      <option value="hi-IN">Hindi</option>
                    </select>
                  </div>
                  {terminalOpen && <div className="terminal-drawer"><div className="terminal-drawer-title">Developer Terminal</div><TerminalPanel /></div>}
                </>
              )}

              {settingsTab === "ai" && (
                <>
                  <div className="settings-section-title">AI & API</div>
                  <div className="api-warning">Your custom key is kept in this browser session and sent directly to the server only when you chat. For a shared production key, keep using Vercel Environment Variables.</div>
                  <label className="field-label">Provider</label>
                  <select className="settings-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    <option value="auto">Auto</option>
                    <option value="openai">OpenAI / ChatGPT</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                  <label className="field-label">API key</label>
                  <input className="settings-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key here" />
                  <label className="field-label">Model (optional)</label>
                  <input className="settings-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={provider === "gemini" ? "e.g. gemini-3.8-flash" : "e.g. gpt-5.6-luna"} />
                  <div className="api-actions">
                    <button onClick={saveApiSettings} className="save-button">Save API settings</button>
                    <button onClick={() => { setApiKey(""); try { sessionStorage.removeItem("zt-api-key"); } catch {} }}>Clear key</button>
                  </div>
                  <p className="settings-small">Leave API key blank to use the server-side Vercel key. The API key is not written to GitHub by this UI.</p>
                </>
              )}

              {settingsTab === "appearance" && (
                <>
                  <div className="settings-section-title">Appearance</div>
                  <div className="theme-grid">
                    {(["midnight", "black", "plum"] as Theme[]).map(item => (
                      <button key={item} className={theme === item ? "theme-option active" : "theme-option"} onClick={() => setTheme(item)}>
                        <span className={"theme-preview " + item} />
                        <b>{item[0].toUpperCase() + item.slice(1)}</b>
                      </button>
                    ))}
                  </div>
                  <div className="settings-control">
                    <div><strong>Font color</strong><span>Choose the main website text color.</span></div>
                    <input className="color-input" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                  </div>
                  <div className="settings-control">
                    <div><strong>Reset appearance</strong><span>Return to the default dark look.</span></div>
                    <button onClick={() => { setTheme("midnight"); setTextColor("#f5f5f7"); }}>Reset</button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <footer>
        <span>ZEROTWO AI STUDIO</span>
        <span>3D Face · AI Chat · Voice</span>
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
