"use client";

import { useEffect, useRef } from "react";

type AvatarState = "idle" | "thinking" | "listening" | "speaking";

type Vec3 = [number, number, number];

type CameraState = {
  position: Vec3;
  target: Vec3;
};

type SketchfabApi = {
  start: (callback?: () => void) => void;
  addEventListener: (event: string, callback: (...args: any[]) => void) => void;
  getCameraLookAt: (callback: (err: any, camera: CameraState) => void) => void;
  setCameraLookAt: (position: Vec3, target: Vec3, duration?: number, callback?: (err: any) => void) => void;
  setCameraEasing: (easing: string) => void;
  setFov: (angle: number, callback?: (err: any, angle: number) => void) => void;
  setUserInteraction: (enabled: boolean, callback?: (err: any) => void) => void;
};

type SketchfabClient = {
  init: (
    uid: string,
    options: {
      success: (api: SketchfabApi) => void;
      error: () => void;
      autostart?: number;
      camera?: number;
      preload?: number;
      ui_controls?: number;
      ui_infos?: number;
      ui_stop?: number;
      ui_inspector?: number;
      ui_watermark?: number;
      ui_watermark_link?: number;
      ui_hint?: number;
      ui_help?: number;
      ui_settings?: number;
      ui_vr?: number;
      ui_fullscreen?: number;
      ui_annotations?: number;
      ui_share?: number;
      ui_general_controls?: number;
      ui_start?: number;
      dnt?: number;
      scrollwheel?: number;
    }
  ) => void;
};

declare global {
  interface Window {
    Sketchfab?: new (iframe: HTMLIFrameElement) => SketchfabClient;
  }
}

const MODEL_UID = "a0257c7826994fd8b1d1ad5d81ee220c";
const VIEWER_SCRIPT = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";

function loadSketchfabScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Sketchfab) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-sketchfab-viewer="true"]'
    );

    if (existing) {
      const finish = () => (window.Sketchfab ? resolve() : reject(new Error("Sketchfab API unavailable")));
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Sketchfab API failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = VIEWER_SCRIPT;
    script.async = true;
    script.dataset.sketchfabViewer = "true";
    script.onload = () => (window.Sketchfab ? resolve() : reject(new Error("Sketchfab API unavailable")));
    script.onerror = () => reject(new Error("Sketchfab API failed to load"));
    document.head.appendChild(script);
  });
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function length(a: Vec3) {
  return Math.hypot(a[0], a[1], a[2]);
}

function normalize(a: Vec3): Vec3 {
  const len = length(a) || 1;
  return scale(a, 1 / len);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function rotateAroundAxis(vector: Vec3, axis: Vec3, angle: number): Vec3 {
  const u = normalize(axis);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = vector[0] * u[0] + vector[1] * u[1] + vector[2] * u[2];
  const crossPart = cross(u, vector);
  return [
    vector[0] * cos + crossPart[0] * sin + u[0] * dot * (1 - cos),
    vector[1] * cos + crossPart[1] * sin + u[1] * dot * (1 - cos),
    vector[2] * cos + crossPart[2] * sin + u[2] * dot * (1 - cos),
  ];
}

export function Avatar2D({ state = "idle" }: { state?: AvatarState }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const apiRef = useRef<SketchfabApi | null>(null);
  const baseCameraRef = useRef<CameraState | null>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const smoothPointer = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const lastCameraUpdate = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const updatePointer = (event: MouseEvent) => {
      const frame = iframeRef.current;
      if (!frame) return;

      const rect = frame.getBoundingClientRect();
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.75);
      const ny = (event.clientY - (rect.top + rect.height * 0.42)) / (rect.height * 0.72);

      pointerTarget.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
    };

    window.addEventListener("mousemove", updatePointer, { passive: true });

    let cancelled = false;

    const animate = (time: number) => {
      const smooth = smoothPointer.current;
      const target = pointerTarget.current;

      smooth.x += (target.x - smooth.x) * 0.055;
      smooth.y += (target.y - smooth.y) * 0.055;

      const api = apiRef.current;
      const base = baseCameraRef.current;

      if (api && base && time - lastCameraUpdate.current > 38) {
        const baseOffset = sub(base.position, base.target);
        const distance = length(baseOffset);
        const forward = normalize(baseOffset);
        const up: Vec3 = [0, 1, 0];
        const right = normalize(cross(forward, up));

        const yaw = smooth.x * 0.075;
        const pitch = -smooth.y * 0.045;

        let offset = rotateAroundAxis(baseOffset, up, yaw);
        offset = rotateAroundAxis(offset, right, pitch);

        const targetShift: Vec3 = [
          smooth.x * distance * 0.035,
          smooth.y * distance * 0.022,
          0,
        ];

        const cameraTarget = add(base.target, targetShift);
        const cameraPosition = add(cameraTarget, offset);

        api.setCameraLookAt(cameraPosition, cameraTarget, 0.09);
        lastCameraUpdate.current = time;
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    const init = async () => {
      try {
        await loadSketchfabScript();
        if (cancelled || !mountedRef.current || !iframeRef.current || !window.Sketchfab) return;

        const client = new window.Sketchfab(iframeRef.current);

        client.init(MODEL_UID, {
          autostart: 1,
          camera: 0,
          preload: 1,
          ui_controls: 0,
          ui_infos: 0,
          ui_stop: 0,
          ui_inspector: 0,
          ui_watermark: 0,
          ui_watermark_link: 0,
          ui_hint: 0,
          ui_help: 0,
          ui_settings: 0,
          ui_vr: 0,
          ui_fullscreen: 0,
          ui_annotations: 0,
          ui_share: 0,
          ui_general_controls: 0,
          ui_start: 0,
          scrollwheel: 0,
          dnt: 1,
          success: (api) => {
            if (cancelled || !mountedRef.current) return;

            apiRef.current = api;
            api.setUserInteraction(false);
            api.setCameraEasing("easeOutCubic");
            api.setFov(36);

            api.start(() => {
              api.addEventListener("viewerready", () => {
                api.setUserInteraction(false);
                api.setCameraEasing("easeOutCubic");

                api.getCameraLookAt((err, camera) => {
                  if (err || !camera) return;

                  const offset = sub(camera.position, camera.target);
                  const distance = length(offset);

                  // Use a slightly wider, farther portrait framing:
                  // full head + a little air above it, ending around the upper stomach.
                  // Passport-style portrait: head centered, a little headroom,
                  // shoulders visible, and the frame ending around the upper chest.
                  // Tight face portrait: move the camera target well above the
                  // model midpoint so the face, not the waist, anchors the frame.
                  const framingOffset = scale(normalize(offset), distance * 0.88);
                  const framingTarget: Vec3 = [
                    camera.target[0],
                    camera.target[1] + distance * 0.90,
                    camera.target[2],
                  ];

                  const framedCamera = add(framingTarget, framingOffset);
                  baseCameraRef.current = {
                    position: framedCamera,
                    target: framingTarget,
                  };

                  api.setCameraLookAt(framedCamera, framingTarget, 0.45);
                });
              });
            });
          },
          error: () => {
            // Keep the frame blank rather than exposing the raw Sketchfab page chrome.
          },
        });

      } catch {
        // Keep the viewer area quiet if the API script cannot load.
      }
    };

    void init();
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.removeEventListener("mousemove", updatePointer);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      apiRef.current = null;
      baseCameraRef.current = null;
    };
  }, []);

  return (
    <div
      className="avatar2d-wrap avatar3d-wrap"
      aria-label={
        state === "speaking"
          ? "Zero Two speaking"
          : state === "listening"
            ? "Zero Two listening"
            : state === "thinking"
              ? "Zero Two thinking"
              : "Zero Two"
      }
    >
      <div className="avatar3d-viewer">
        <iframe
          ref={iframeRef}
          title="Zero Two"
          frameBorder="0"
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay"
          className="avatar3d-iframe"
        />
      </div>
    </div>
  );
}
