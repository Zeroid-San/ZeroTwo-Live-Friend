"use client";

import { useMemo } from "react";

type AvatarState = "idle" | "thinking" | "listening" | "speaking";

export function Avatar2D({ state = "idle" }: { state?: AvatarState }) {
  const embedUrl = useMemo(
    () =>
      "https://sketchfab.com/models/9117416b98ec4acda2b2ba109e3096d9/embed" +
      "?autostart=1&camera=0&preload=1&ui_infos=0&ui_stop=0&ui_inspector=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark",
    []
  );

  const status =
    state === "speaking"
      ? "SPEAKING"
      : state === "listening"
        ? "LISTENING"
        : state === "thinking"
          ? "THINKING"
          : "LIVE";

  return (
    <div className="avatar2d-wrap avatar3d-wrap" aria-label="Interactive Zero Two 3D companion">
      <div className="avatar2d-glow" />
      <div className="avatar3d-viewer">
        <iframe
          title="Zero Two — Bagus Sujiwa"
          src={embedUrl}
          frameBorder="0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          className="avatar3d-iframe"
        />
      </div>

      <div className="avatar2d-status">
        <i />
        {status}
      </div>

      <a
        className="avatar3d-credit"
        href="https://sketchfab.com/3d-models/zero-two-9117416b98ec4acda2b2ba109e3096d9"
        target="_blank"
        rel="noreferrer"
      >
        Zero Two · Bagus Sujiwa · Sketchfab
      </a>
    </div>
  );
}
