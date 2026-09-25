"use client";

import { useEffect, useRef, useState } from "react";

export function TerminalPanel() {
  const [lines, setLines] = useState<string[]>([
    "ZeroTwo developer terminal",
    "Local safe commands work here. A GPU workspace WebSocket can provide a full shell when configured.",
    "",
    "Type \"help\" for available commands.",
    ""
  ]);
  const [command, setCommand] = useState("");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
    if (!url) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }

    socket.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "output") {
          setLines(current => [...current, ...String(message.data).split("\n")]);
        } else if (message.type === "error") {
          setLines(current => [...current, String(message.data || "Terminal error.")]);
        }
      } catch {
        setLines(current => [...current, event.data]);
      }
    };

    return () => {
      ws.close();
      socket.current = null;
    };
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [lines]);

  async function runHostedCommand(text: string) {
    setRunning(true);
    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text })
      });
      const data = await response.json();
      if (!response.ok) {
        setLines(current => [...current, data.error || "Command failed.", ""]);
      } else if (data.clear) {
        setLines([]);
      } else {
        setLines(current => [...current, String(data.output || "(no output)"), ""]);
      }
    } catch {
      setLines(current => [...current, "Terminal service unavailable.", ""]);
    } finally {
      setRunning(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = command.trim();
    if (!text || running) return;

    if (text === "clear") {
      setCommand("");
      setLines([]);
      return;
    }

    setLines(current => [...current, "$ " + text]);

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: "input", data: text + "\n" }));
    } else {
      await runHostedCommand(text);
    }

    setCommand("");
  }

  return (
    <div className="terminal">
      <div className="terminal-head">
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-title">workspace / terminal</span>
        <span className={connected ? "terminal-status connected" : "terminal-status"}>
          {connected ? "CONNECTED" : "LOCAL"}
        </span>
      </div>

      <div className="terminal-body" ref={bodyRef}>
        {lines.map((line, index) => (
          <div className="terminal-line" key={index}>{line}</div>
        ))}
        <form className="terminal-input" onSubmit={submit}>
          <span className="prompt">$&nbsp;</span>
          <input
            autoComplete="off"
            spellCheck={false}
            value={command}
            onChange={e => setCommand(e.target.value)}
            aria-label="Terminal command"
            placeholder={running ? "running..." : "type a command..."}
            disabled={running}
          />
        </form>
      </div>
    </div>
  );
}
