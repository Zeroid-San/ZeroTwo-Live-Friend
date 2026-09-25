"use client";

import { useEffect, useRef, useState } from "react";

type AvatarState = "idle" | "thinking" | "listening" | "speaking";

export function Avatar2D({ state = "idle" }: { state?: AvatarState }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      const y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      target.current = { x, y };
      if (raf.current === null) {
        raf.current = window.requestAnimationFrame(() => {
          setPointer(target.current);
          raf.current = null;
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  const headTransform = "translate(" + (pointer.x * 7) + "px, " + (pointer.y * 4) + "px) rotate(" + (pointer.x * 1.8) + "deg)";
  const eyeTransform = "translate(" + (pointer.x * 4) + "px, " + (pointer.y * 2.2) + "px)";

  return (
    <div className="avatar2d-wrap" aria-label="Interactive anime companion">
      <div className="avatar2d-glow" />
      <svg className="avatar2d-art" viewBox="0 0 520 680" role="img" aria-label="Pink-haired anime-style companion">
        <defs>
          <linearGradient id="avatarHair" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ff8db5" />
            <stop offset=".42" stopColor="#f2477f" />
            <stop offset="1" stopColor="#a61d4f" />
          </linearGradient>
          <linearGradient id="avatarSkin" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffe5dc" />
            <stop offset="1" stopColor="#edb7aa" />
          </linearGradient>
          <linearGradient id="avatarCoat" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#2b2632" />
            <stop offset="1" stopColor="#0d0c12" />
          </linearGradient>
          <filter id="avatarShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="15" floodOpacity=".5" />
          </filter>
        </defs>

        <g style={{ transform: headTransform, transformOrigin: "260px 300px" }}>
          <path d="M113 215C83 118 130 46 220 77c27-27 66-35 100-23 76-26 126 43 102 127l-22 69H139z" fill="url(#avatarHair)" filter="url(#avatarShadow)" />
          <path d="M108 216C85 179 83 126 118 86c35-39 79-45 116-27-57 3-95 36-106 85z" fill="#ef4d83" />
          <path d="M412 216c23-37 25-90-10-130-35-39-79-45-116-27 57 3 95 36 106 85z" fill="#cf2e68" />

          <path d="M151 165c22-52 73-85 128-85 63 0 112 36 132 90l-14 182c-7 91-65 149-119 149h-46c-54 0-112-58-119-149z" fill="url(#avatarSkin)" stroke="#dfa79d" strokeWidth="2" />
          <path d="M111 174L75 91c36 1 72 21 90 59" fill="url(#avatarHair)" stroke="#8d214f" strokeWidth="4" />
          <path d="M409 174l36-83c-36 1-72 21-90 59" fill="url(#avatarHair)" stroke="#8d214f" strokeWidth="4" />

          <path d="M121 169c11-74 72-120 158-120 88 0 147 48 158 125-29-32-70-61-118-74-47 17-112 22-198 69z" fill="url(#avatarHair)" />
          <path d="M174 144c-24 21-45 52-54 91 28-12 55-19 87-22-8-22-18-44-33-69z" fill="#f35b8d" opacity=".86" />
          <path d="M346 144c24 21 45 52 54 91-28-12-55-19-87-22 8-22 18-44 33-69z" fill="#d63b72" opacity=".8" />

          <path d="M103 127L61 83l61 18 12 57z" fill="#d72963" stroke="#8c214e" strokeWidth="4" />
          <path d="M417 127l42-44-61 18-12 57z" fill="#d72963" stroke="#8c214e" strokeWidth="4" />

          <path d="M166 236c25-17 58-20 84-9" fill="none" stroke="#7a2947" strokeWidth="9" strokeLinecap="round" />
          <path d="M354 236c-25-17-58-20-84-9" fill="none" stroke="#7a2947" strokeWidth="9" strokeLinecap="round" />

          <g style={{ transform: eyeTransform, transformOrigin: "260px 286px" }}>
            <ellipse cx="203" cy="286" rx="39" ry="30" fill="#fff8fb" />
            <ellipse cx="317" cy="286" rx="39" ry="30" fill="#fff8fb" />
            <ellipse cx="208" cy="290" rx="16" ry={state === "speaking" ? 24 : state === "thinking" ? 13 : 22} fill="#8b184a" />
            <ellipse cx="312" cy="290" rx="16" ry={state === "speaking" ? 24 : state === "thinking" ? 13 : 22} fill="#8b184a" />
            <ellipse cx="208" cy="292" rx="8" ry="13" fill="#351124" />
            <ellipse cx="312" cy="292" rx="8" ry="13" fill="#351124" />
            <circle cx="214" cy="282" r="5" fill="#fff" />
            <circle cx="306" cy="282" r="5" fill="#fff" />
          </g>

          <path d="M246 331c9 7 19 7 28 0" fill="none" stroke="#d8988c" strokeWidth="5" strokeLinecap="round" />
          <path
            d={state === "speaking"
              ? "M224 389c23-18 49-18 72 0-7 19-65 19-72 0z"
              : "M235 389c17 10 33 10 50 0"}
            fill="none"
            stroke="#8b2850"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {state === "speaking" && <path d="M241 392c12 6 25 6 38 0" fill="none" stroke="#f28ea8" strokeWidth="5" strokeLinecap="round" />}

          <path d="M174 409c17 10 29 14 42 16" fill="none" stroke="#f08ca7" strokeWidth="10" strokeLinecap="round" opacity=".5" />
          <path d="M346 409c-17 10-29 14-42 16" fill="none" stroke="#f08ca7" strokeWidth="10" strokeLinecap="round" opacity=".5" />

          <path d="M160 470c28-42 70-61 100-61s72 19 100 61l31 150H129z" fill="url(#avatarCoat)" stroke="#35313e" strokeWidth="3" />
          <path d="M223 482l37 40 37-40 20 143H203z" fill="#faf7f4" />
          <path d="M213 486l47 45 47-45-13-21h-68z" fill="#d92d62" />
          <path d="M230 493l30 29 30-29" fill="none" stroke="#ff7da1" strokeWidth="5" />
          <circle cx="260" cy="555" r="9" fill="#f1d2df" />
          <circle cx="260" cy="595" r="9" fill="#f1d2df" />
        </g>
      </svg>
      <div className="avatar2d-status"><i />{state === "speaking" ? "SPEAKING" : state === "listening" ? "LISTENING" : state === "thinking" ? "THINKING" : "LIVE"}</div>
    </div>
  );
}
