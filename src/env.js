import fs from "node:fs/promises";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export async function loadEnvFile(envPath = ".env") {
  const absolutePath = path.resolve(envPath);
  try {
    const contents = await fs.readFile(absolutePath, "utf8");
    for (const line of contents.split(/\r?\n/u)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export function getEnv(key, fallback = undefined) {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

export function getRequiredEnv(key) {
  const value = getEnv(key);
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno requerida: ${key}`);
  }
  return value;
}

export function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

export function toInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
