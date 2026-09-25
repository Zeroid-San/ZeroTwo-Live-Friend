"use client";

import { useMemo } from "react";

type AvatarState = "idle" | "thinking" | "listening" | "speaking";

export function Avatar2D({ state = "idle" }: { state?: AvatarState }) {
  const embedUrl = useMemo(
    () =>
      "https://sketchfab.com/models/a0257c7826994fd8b1d1ad5d81ee220c/embed" +
      "?autostart=1&preload=1&camera=0&transparent=0" +
      "&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0" +
      "&ui_watermark=0&ui_watermark_link=0&ui_hint=0" +
      "&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0" +
      "&ui_annotations=0&ui_share=0&ui_theme=dark",
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
    <div className="avatar2d-wrap avatar3d-wrap" aria-label="Zero Two 3D companion">
      <div className="avatar2d-glow" />
      <div className="avatar3d-viewer">
        <iframe
          title="Zero Two - Darling in the Franxx"
          src={embedUrl}
          frameBorder="0"
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay"
          className="avatar3d-iframe"
        />
      </div>

      <div className="avatar2d-status">
        <i />
        {status}
      </div>
    </div>
  );
}
