"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starter: Message[] = [
  { role: "assistant", content: "Hey. I’m here. Talk to me." }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zt-live-messages");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("zt-live-messages", JSON.stringify(messages));
  }, [messages]);

  function speak(text: string) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.08;
      window.speechSynthesis.speak(utterance);
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
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
    };
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
      speak(answer);
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
  }

  return (
    <main className="shell">
      <section className="companion">
        <div className="status"><span className="dot" /> LIVE COMPANION</div>
        <div className="character-wrap">
          <div className="aura" />
          <div className="character-card">
            <img src="/character.png" alt="Companion" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="fallback-character"><span>ZT</span></div>
          </div>
        </div>
        <div className="presence">
          <h1>Zero Two</h1>
          <p>Live with you</p>
        </div>
        <div className="controls">
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="auto">Auto provider</option>
            <option value="openai">ChatGPT / OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <button onClick={clearChat}>Clear</button>
        </div>
      </section>

      <section className="chat">
        <header>
          <div>
            <span className="eyebrow">LIVE MODE</span>
            <h2>Talk with her</h2>
          </div>
          <span className="provider">{provider}</span>
        </header>

        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "message user" : "message"}>
              <span className="label">{message.role === "user" ? "YOU" : "ZERO TWO"}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {busy && <div className="typing"><span /><span /><span /> thinking...</div>}
        </div>

        <form onSubmit={sendMessage} className="composer">
          <button type="button" className={listening ? "mic active" : "mic"} onClick={startListening} aria-label="Voice input">●</button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "Listening..." : "Say something..."} />
          <button type="submit" className="send" disabled={busy || !input.trim()}>Send</button>
        </form>
        <p className="notice">Your AI key stays on the server when configured through Vercel environment variables.</p>
      </section>
    </main>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}