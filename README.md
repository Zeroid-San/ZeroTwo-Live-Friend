# ZeroTwo AI Studio

A dark two-panel AI workspace: a live Zero Two companion on the left and a real-time terminal on the right.

## Architecture

```text
GitHub repository
   |
   +--> Vercel: Next.js website
   |      +-- Live chat
   |      +-- microphone input
   |      +-- GPU TTS proxy
   |      +-- browser terminal UI
   |
   +--> GPU provider: services/gpu
          +-- FastAPI
          +-- Chatterbox TTS
          +-- WebSocket terminal
          +-- persistent /workspace
```

## Repository

- `app/` — Vercel/Next.js web application.
- `app/components/TerminalPanel.tsx` — terminal UI and WebSocket client.
- `app/api/chat/route.ts` — OpenAI/Gemini chat endpoint.
- `app/api/tts/route.ts` — server-side proxy to the GPU voice service.
- `services/gpu/` — Dockerized GPU backend for Chatterbox and terminal sessions.

## Vercel environment variables

Set these in Vercel Project Settings > Environment Variables:

- `OPENAI_API_KEY` and optionally `OPENAI_MODEL`
- `GEMINI_API_KEY` and optionally `GEMINI_MODEL`
- `GPU_TTS_URL` — public HTTPS URL for the GPU `/tts` endpoint
- `GPU_API_KEY` — shared secret for the GPU TTS endpoint
- `NEXT_PUBLIC_TERMINAL_WS_URL` — `wss://.../ws/terminal` URL for the GPU terminal

Never commit API keys or voice recordings.

## GPU backend

The GPU backend expects an NVIDIA CUDA environment. Mount persistent storage at `/workspace` and put the permitted voice reference at:

`/workspace/voices/reference.wav`

Set `GPU_API_KEY` on the GPU machine to the same secret configured in Vercel.

Build and run the container:

```bash
docker build -t zerotwo-gpu ./services/gpu
docker run --gpus all -p 8000:8000 -e GPU_API_KEY='your-secret' -v zerotwo-workspace:/workspace zerotwo-gpu
```

## Security

The terminal backend currently demonstrates a PTY connection for the private GPU workspace. Before exposing it to the public internet, put it behind authentication and an isolated sandbox/container per user. Do not expose an unrestricted host shell to untrusted users.

## Local web development

```bash
npm install
npm run dev
```