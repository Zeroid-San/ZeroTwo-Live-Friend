import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const MAX_OUTPUT = 12000;

function safePath(input: string) {
  const requested = input.trim() || "README.md";
  const resolved = path.resolve(ROOT, requested);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) return null;
  return resolved;
}

async function listDirectory() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  return entries
    .filter(entry => !entry.name.startsWith(".next"))
    .map(entry => entry.isDirectory() ? entry.name + "/" : entry.name)
    .sort()
    .join("\n");
}

async function runCommand(command: string) {
  const normalized = command.replace(/\s+/g, " ").trim();

  if (normalized === "help") {
    return [
      "Available hosted commands:",
      "  help",
      "  clear",
      "  pwd",
      "  ls / dir",
      "  whoami",
      "  node -v",
      "  npm -v",
      "  uname",
      "  date",
      "  git status",
      "  cat <safe-file>",
      "  echo <text>",
      "",
      "For a full interactive shell, connect NEXT_PUBLIC_TERMINAL_WS_URL to the GPU workspace."
    ].join("\n");
  }

  if (normalized === "pwd") return ROOT;
  if (normalized === "ls" || normalized === "dir") return listDirectory();
  if (normalized === "whoami") return os.userInfo().username;
  if (normalized === "node -v" || normalized === "node --version") return process.version;
  if (normalized === "npm -v" || normalized === "npm --version") {
    const { stdout } = await execFileAsync("npm", ["--version"], { cwd: ROOT, timeout: 4000 });
    return stdout.trim();
  }
  if (normalized === "uname" || normalized === "uname -a") {
    return [os.type(), os.release(), os.arch()].join(" ");
  }
  if (normalized === "date") return new Date().toString();
  if (normalized === "git status" || normalized === "git status --short") {
    const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd: ROOT, timeout: 5000 });
    return stdout.trim() || "working tree clean";
  }

  if (normalized.startsWith("echo ")) {
    return normalized.slice(5);
  }

  if (normalized.startsWith("cat ")) {
    const file = safePath(normalized.slice(4));
    if (!file) throw new Error("That path is outside the project workspace.");
    const content = await readFile(file, "utf8");
    return content.slice(0, MAX_OUTPUT);
  }

  throw new Error("Command not allowed in the hosted terminal. Use help, or connect the GPU workspace for a full shell.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const command = typeof body.command === "string" ? body.command.trim() : "";
    if (!command) return NextResponse.json({ error: "Command is required." }, { status: 400 });
    if (command.length > 400) return NextResponse.json({ error: "Command is too long." }, { status: 400 });

    if (command === "clear") return NextResponse.json({ clear: true });

    const output = await runCommand(command);
    return NextResponse.json({ output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
