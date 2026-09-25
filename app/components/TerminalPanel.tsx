"use client";

import { useEffect, useRef, useState } from "react";

export function TerminalPanel() {
  const [lines, setLines] = useState<string[]>([
    "ZeroTwo AI Studio terminal",
    "Connect the GPU backend to enable real command execution.",
    ""
  ]);
  const [command, setCommand] = useState("");
  const [connected, setConnected] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
    if (!url) return;

    const ws = new WebSocket(url);
    socket.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "output") {
          setLines(current => [...current, ...String(message.data).split("\n")]);
        }
      } catch {
        setLines(current => [...current, event.data]);
      }
    };

    return () => ws.close();
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = command.trim();
    if (!text) return;

    setLines(current => [...current, "$ " + text]);

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: "input", data: text + "\n" }));
    } else {
      setLines(current => [...current, "Backend is not connected.", "Set NEXT_PUBLIC_TERMINAL_WS_URL after deploying the GPU workspace.", ""]);
    }
    setCommand("");
  }

  return (
    <div className="terminal">
      <div className="terminal-head">
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span style={{ marginLeft: 6 }}>workspace / terminal</span>
        <span style={{ marginLeft: "auto", color: connected ? "#55e39a" : "#777" }}>
          {connected ? "CONNECTED" : "OFFLINE"}
        </span>
      </div>
      <div className="terminal-body">
        {lines.map((line, index) => (
          <div className="terminal-line" key={index}>{line}</div>
        ))}
        <form className="terminal-input" onSubmit={submit}>
          <span className="prompt">$&nbsp;</span>
          <input autoComplete="off" value={command} onChange={e => setCommand(e.target.value)} aria-label="Terminal command" placeholder="type a command..." />
        </form>
      </div>
    </div>
  );
}
