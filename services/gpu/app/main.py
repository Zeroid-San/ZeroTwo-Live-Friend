import asyncio
import os
import pty
import select
from io import BytesIO

import numpy as np
import torch
from scipy.io import wavfile
from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from chatterbox.tts_turbo import ChatterboxTurboTTS

API_KEY = os.getenv("GPU_API_KEY", "change-me")
WORKSPACE = os.getenv("WORKSPACE_DIR", "/workspace")
VOICE_FILE = os.getenv("VOICE_FILE", WORKSPACE + "/voices/reference.wav")

app = FastAPI(title="ZeroTwo AI Studio GPU Backend")
device = "cuda" if torch.cuda.is_available() else "cpu"
tts_model = None

class TTSRequest(BaseModel):
    text: str

@app.on_event("startup")
def load_models():
    global tts_model
    if os.getenv("DISABLE_TTS", "0") == "1":
        return
    if not os.path.exists(VOICE_FILE):
        print("Voice reference not found: " + VOICE_FILE)
        return
    print("Loading Chatterbox on " + device)
    tts_model = ChatterboxTurboTTS.from_pretrained(device=device)
    print("Chatterbox ready.")

@app.get("/health")
def health():
    return {"status": "ok", "device": device, "tts_ready": tts_model is not None}

@app.post("/tts")
def tts(request: TTSRequest, x_gpu_key: str | None = Header(default=None)):
    if x_gpu_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid GPU key")
    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model is not ready")
    text = request.text.strip()
    if not text or len(text) > 1000:
        raise HTTPException(status_code=400, detail="Text must be 1-1000 characters")
    audio = tts_model.generate(text, audio_prompt_path=VOICE_FILE)
    data = audio.squeeze().detach().cpu().numpy().astype(np.float32)
    buffer = BytesIO()
    wavfile.write(buffer, tts_model.sr, data)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="audio/wav")

@app.websocket("/ws/terminal")
async def terminal(websocket: WebSocket):
    await websocket.accept()
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(WORKSPACE)
        os.environ["TERM"] = "xterm-256color"
        os.execv("/bin/bash", ["/bin/bash", "--noprofile", "--norc"])

    async def read_pty():
        while True:
            ready, _, _ = select.select([fd], [], [], 0.1)
            if ready:
                try:
                    data = os.read(fd, 4096).decode("utf-8", errors="replace")
                    await websocket.send_json({"type": "output", "data": data})
                except OSError:
                    break
            await asyncio.sleep(0.01)

    reader = asyncio.create_task(read_pty())
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "input":
                os.write(fd, str(message.get("data", "")).encode())
    except WebSocketDisconnect:
        pass
    finally:
        reader.cancel()
        try:
            os.kill(pid, 15)
        except ProcessLookupError:
            pass
        os.close(fd)