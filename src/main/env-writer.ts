import { app } from "electron";
import fs from "fs";
import path from "path";

const ENV_PATH = (): string => path.join(app.getPath("userData"), ".env");

export function setEnvVar(key: string, value: string): void {
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
    throw new Error(`Invalid env key: ${key}`);
  }

  let body = "";
  try {
    body = fs.readFileSync(ENV_PATH(), "utf8");
  } catch {
    body = "";
  }

  const lines = body.split(/\r?\n/);
  const prefix = `${key}=`;
  let replaced = false;
  const next = lines.map(line => {
    if (line.startsWith(prefix) || line.startsWith(`${key} =`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) {
    if (next.length > 0 && next[next.length - 1] === "") next.pop();
    next.push(`${key}=${value}`);
  }
  if (next[next.length - 1] !== "") next.push("");

  const target = ENV_PATH();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, next.join("\n"), "utf8");

  process.env[key] = value;
}
