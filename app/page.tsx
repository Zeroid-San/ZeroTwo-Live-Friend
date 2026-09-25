"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { TerminalPanel } from "./components/TerminalPanel";
import { Avatar2D } from "./components/Avatar2D";

type Message = { role: "user" | "assistant"; content: string };
type Theme = "midnight" | "black" | "plum";
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };

const starter: Message[] = [{ role: "assistant", content: "Hey. I’m here." }];

const modelOptions = {
  auto: [{ id: "", label: "Server default" }],
  openai: [
    { id: "gpt-6-astra", label: "GPT-6 Astra" },
    { id: "gpt-6-sol", label: "GPT-6 Sol" },
    { id: "gpt-6-luna", label: "GPT-6 Luna" },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" }
  ],
  gemini: [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
  ]
} as const;


function SidebarIcon({ type, collapsed = false }: { type: "new" | "search" | "settings" | "collapse" | "chat"; collapsed?: boolean }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "new") return <svg {...common}><path d="M5 17.5 6.2 13 15.8 3.4a2.1 2.1 0 0 1 3 3L9.2 16z" /><path d="m14.6 4.6 4.8 4.8M5 17.5l4.2-1.2" /></svg>;
  if (type === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.7" /><path d="m16 16 4.2 4.2" /></svg>;
  if (type === "settings") return <svg {...common}><path d="M9.6 4.2 10.9 3h2.2l1.3 1.2.2 1.8 1.7 1 .1-0.1 1.8-.4 1.6 1.6-.4 1.8 1 1.7 1.8.2v2.2l-1.8.2-1 1.7.4 1.8-1.6 1.6-1.8-.4-1.7 1-.2 1.8h-2.2l-.2-1.8-1.7-1-1.8.4-1.6-1.6.4-1.8-1-1.7L3.8 13v-2.2l1.8-.2 1-1.7-.4-1.8 1.6-1.6 1.8.4 1.7-1 .3-1.7Z" /><circle cx="12" cy="11.9" r="2.7" /></svg>;
  if (type === "collapse") return <svg {...common}><path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} /></svg>;
  return <svg {...common}><path d="M5 6.5h14a1.8 1.8 0 0 1 1.8 1.8v6.2a1.8 1.8 0 0 1-1.8 1.8H12l-4.7 3v-3H5a1.8 1.8 0 0 1-1.8-1.8V8.3A1.8 1.8 0 0 1 5 6.5Z" /><circle cx="9" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none" /></svg>;
}

function makeTitle(messages: Message[]) {
  const firstUser = messages.find(message => message.role === "user")?.content?.trim();
  if (!firstUser) return "New chat";
  return firstUser.replace(/\s+/g, " ").slice(0, 34) || "New chat";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState("current");
  const [searchChats, setSearchChats] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<"auto" | "openai" | "gemini">("auto");
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
    if (savedMessages) {
      try { setMessages(JSON.parse(savedMessages)); } catch {}
    }

    const savedChats = localStorage.getItem("zt-chats");
    if (savedChats) {
      try { setChats(JSON.parse(savedChats)); } catch {}
    }

    const savedChatId = localStorage.getItem("zt-current-chat");
    if (savedChatId) setCurrentChatId(savedChatId);

    const savedSidebar = localStorage.getItem("zt-sidebar-collapsed");
    if (savedSidebar !== null) setSidebarCollapsed(savedSidebar === "true");


    const savedTheme = localStorage.getItem("zt-theme") as Theme | null;
    if (savedTheme) setTheme(savedTheme);

    const savedTextColor = localStorage.getItem("zt-text-color");
    if (savedTextColor) setTextColor(savedTextColor);

    const savedProvider = localStorage.getItem("zt-provider") as "auto" | "openai" | "gemini" | null;
    if (savedProvider === "auto" || savedProvider === "openai" || savedProvider === "gemini") setProvider(savedProvider);

    const savedModel = localStorage.getItem("zt-model");
    if (savedModel !== null) setModel(savedModel);

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
    localStorage.setItem("zt-current-chat", currentChatId);
  }, [messages, currentChatId]);

  useEffect(() => {
    if (!currentChatId || currentChatId === "current") return;
    setChats(current => {
      const existing = current.find(chat => chat.id === currentChatId);
      const nextChat: Chat = {
        id: currentChatId,
        title: makeTitle(messages),
        messages,
        updatedAt: Date.now()
      };
      if (!existing) return [...current, nextChat];
      return current.map(chat => chat.id === currentChatId ? nextChat : chat);
    });
  }, [messages, currentChatId]);

  useEffect(() => {
    localStorage.setItem("zt-chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("zt-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);


  useEffect(() => {
    localStorage.setItem("zt-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("zt-text-color", textColor);
    document.documentElement.style.setProperty("--user-text", textColor);
  }, [textColor]);

  useEffect(() => {
    localStorage.setItem("zt-voice", String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    localStorage.setItem("zt-auto-speak", String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    localStorage.setItem("zt-enter-send", String(enterToSend));
  }, [enterToSend]);

  const filteredChats = useMemo(() => {
    const query = searchChats.trim().toLowerCase();
    return [...chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(chat => !query || chat.title.toLowerCase().includes(query));
  }, [chats, searchChats]);

  function openSettings(tab: "general" | "ai" | "appearance") {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  function changeProvider(nextProvider: "auto" | "openai" | "gemini") {
    setProvider(nextProvider);
    setModel(nextProvider === "auto" ? "" : modelOptions[nextProvider][0].id);
  }

  function changeModel(nextModel: string) {
    setModel(nextModel);
  }

  function saveApiSettings() {
    localStorage.setItem("zt-provider", provider);
    localStorage.setItem("zt-model", model);
    try {
      if (apiKey.trim()) sessionStorage.setItem("zt-api-key", apiKey.trim());
      else sessionStorage.removeItem("zt-api-key");
    } catch {}
  }

  function startNewChat() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    const id = crypto.randomUUID();
    setCurrentChatId(id);
    setMessages(starter);
    setInput("");
  }

  function openChat(chat: Chat) {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setInput("");
  }

  function deleteChat(id: string) {
    setChats(current => current.filter(chat => chat.id !== id));
    if (currentChatId === id) startNewChat();
  }

  function beginRename(chat: Chat) {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  }

  function finishRename(id: string) {
    const title = renameValue.trim().slice(0, 48);
    if (title) setChats(current => current.map(chat => chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat));
    setRenamingId(null);
    setRenameValue("");
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

    if (currentChatId === "current") {
      const id = crypto.randomUUID();
      setCurrentChatId(id);
    }

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

  const avatarState = speaking ? "speaking" : busy ? "thinking" : listening ? "listening" : "idle";

  return (
    <main className={sidebarCollapsed ? "studio sidebar-is-collapsed" : "studio"}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(v => !v)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><SidebarIcon type="collapse" collapsed={sidebarCollapsed} /></button>
          {!sidebarCollapsed && (
            <div className="sidebar-brand">
              <div className="sidebar-mark">ZT</div>
              <span>ZeroTwo</span>
            </div>
          )}
        </div>

        <button className="new-chat" onClick={startNewChat} title="New chat">
          <span className="icon-wrap"><SidebarIcon type="new" /></span>
          {!sidebarCollapsed && "New chat"}
        </button>

        {!sidebarCollapsed && (
          <div className="chat-search">
            <span className="icon-wrap"><SidebarIcon type="search" /></span>
            <input value={searchChats} onChange={e => setSearchChats(e.target.value)} placeholder="Search chats" />
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="chat-history">
            <div className="history-label">CHATS</div>
            {filteredChats.length === 0 ? (
              <div className="history-empty">Your conversations will appear here.</div>
            ) : (
              filteredChats.map(chat => (
                <div key={chat.id} className={chat.id === currentChatId ? "chat-item current" : "chat-item"}>
                  {renamingId === chat.id ? (
                    <input
                      className="rename-input"
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => finishRename(chat.id)}
                      onKeyDown={e => {
                        if (e.key === "Enter") finishRename(chat.id);
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                    />
                  ) : (
                    <>
                      <button className="chat-open" onClick={() => openChat(chat)}>
                        <span className="chat-icon"><SidebarIcon type="chat" /></span>
                        <span className="chat-title">{chat.title}</span>
                      </button>
                      <div className="chat-actions">
                        <button onClick={() => beginRename(chat)} title="Rename">⋯</button>
                        <button onClick={() => deleteChat(chat.id)} title="Delete">×</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="sidebar-spacer" />

        <button className="side-item settings-item" onClick={() => openSettings("general")} title="Settings">
          <span className="icon-wrap"><SidebarIcon type="settings" /></span>
          {!sidebarCollapsed && "Settings"}
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">Z</div>
          {!sidebarCollapsed && (
            <div>
              <strong>ZeroTwo AI</strong>
              <span>Live companion</span>
            </div>
          )}
        </div>
      </aside>

      <section className="main-shell">
        <div className="main-view">
          <div className="companion-stage">
              <div className="character-wrap">
                <div className="aura" />
                <div className="character-card avatar-card">
                  <Avatar2D state={avatarState} />
                </div>
              </div>

              <div className="presence-dot"><i />{speaking ? "Speaking" : busy ? "Thinking" : listening ? "Listening" : "Ready"}</div>

              <div className="chat-messages">
                {messages.slice(-8).map((message, index) => (
                  <div key={index} className={message.role === "user" ? "mini-message user" : "mini-message"}>
                    <b>{message.role === "user" ? "YOU" : "ZERO TWO"}</b>
                    <span>{message.content}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="composer">
                <button type="button" className="mic-button" onClick={startListening}>◉</button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleComposerKeyDown} placeholder={listening ? "Listening..." : "Message ZeroTwo..."} />
                <button className="send" disabled={busy || !input.trim()}>Send</button>
              </form>
            </div>
        </div>
      </section>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <section className="settings-panel" onClick={e => e.stopPropagation()}>
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
                  <div className="settings-control"><div><strong>Voice</strong><span>Turn all voice output on or off.</span></div><button onClick={() => setVoiceEnabled(v => !v)}>{voiceEnabled ? "ON" : "OFF"}</button></div>
                  <div className="settings-control"><div><strong>Auto voice</strong><span>Speak every AI reply automatically.</span></div><button onClick={() => setAutoSpeak(v => !v)}>{autoSpeak ? "ON" : "OFF"}</button></div>
                  <div className="settings-control"><div><strong>Enter to send</strong><span>Press Enter to send your message.</span></div><button onClick={() => setEnterToSend(v => !v)}>{enterToSend ? "ON" : "OFF"}</button></div>
                  <div className="settings-control"><div><strong>Sidebar</strong><span>Collapse or expand the sidebar.</span></div><button onClick={() => setSidebarCollapsed(v => !v)}>{sidebarCollapsed ? "EXPAND" : "COLLAPSE"}</button></div>
                  <div className="settings-control"><div><strong>Language</strong><span>Used for microphone recognition and browser voice fallback.</span></div><select value={language} onChange={e => { setLanguage(e.target.value); localStorage.setItem("zt-language", e.target.value); }}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="ja-JP">Japanese</option><option value="ko-KR">Korean</option><option value="hi-IN">Hindi</option></select></div>
                  {terminalOpen && <div className="terminal-drawer"><div className="terminal-drawer-title">Developer Terminal</div><TerminalPanel /></div>}
                </>
              )}

              {settingsTab === "ai" && (
                <>
                  <div className="settings-section-title">AI & API</div>
                  <div className="api-warning">Use a session API key for your own testing, or leave this blank to use the secure server-side Vercel key.</div>
                  <label className="field-label">AI provider</label>
                  <select className="settings-input" value={provider} onChange={e => changeProvider(e.target.value as "auto" | "openai" | "gemini")}>
                    <option value="auto">Auto (server configured)</option>
                    <option value="openai">OpenAI / ChatGPT</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                  <label className="field-label">Model</label>
                  <select className="settings-input" value={model} onChange={e => changeModel(e.target.value)}>
                    {modelOptions[provider].map(option => <option key={option.id || "default"} value={option.id}>{option.label}</option>)}
                  </select>
                  <label className="field-label">API key</label>
                  <input className="settings-input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your API key here" />
                  <div className="api-actions"><button onClick={saveApiSettings} className="save-button">Save API settings</button><button onClick={() => { setApiKey(""); try { sessionStorage.removeItem("zt-api-key"); } catch {} }}>Clear key</button></div>
                  <p className="settings-small">The custom key is stored only in this browser session. It is never committed to GitHub.</p>
                </>
              )}

              {settingsTab === "appearance" && (
                <>
                  <div className="settings-section-title">Appearance</div>
                  <div className="theme-grid">
                    {(["midnight", "black", "plum"] as Theme[]).map(item => <button key={item} className={theme === item ? "theme-option active" : "theme-option"} onClick={() => setTheme(item)}><span className={"theme-preview " + item} /><b>{item[0].toUpperCase() + item.slice(1)}</b></button>)}
                  </div>
                  <div className="settings-control"><div><strong>Font color</strong><span>Choose the main website text color.</span></div><input className="color-input" type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /></div>
                  <div className="settings-control"><div><strong>Reset appearance</strong><span>Return to the default dark look.</span></div><button onClick={() => { setTheme("midnight"); setTextColor("#f5f5f7"); }}>Reset</button></div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

    </main>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
