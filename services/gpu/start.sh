#!/bin/sh
set -eu
mkdir -p /workspace/voices /workspace/generated /workspace/projects /workspace/temp
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000