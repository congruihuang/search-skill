import fs from "node:fs";
import path from "node:path";

export interface LuminaConfig {
  endpoint: string;
  bearerToken: string;
}

interface PartialConfig {
  endpoint?: string;
  bearerToken?: string;
}

function tryReadJsonFile(filePath: string): PartialConfig | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as PartialConfig;
    return parsed;
  } catch {
    return null;
  }
}

export function loadConfig(): LuminaConfig {
  // 1. Environment variables (highest priority)
  const envEndpoint = process.env.LUMINA_ENDPOINT;
  const envToken = process.env.LUMINA_BEARER_TOKEN;

  // 2. Project-local config
  const localConfig = tryReadJsonFile(
    path.resolve(process.cwd(), "lumina-config.json")
  );

  // Merge with precedence
  const endpoint = envEndpoint || localConfig?.endpoint;
  const bearerToken = envToken || localConfig?.bearerToken;

  if (!endpoint) {
    throw new Error(
      "Lumina endpoint not configured. Set LUMINA_ENDPOINT env var or add 'endpoint' to lumina-config.json"
    );
  }
  if (!bearerToken) {
    throw new Error(
      "Lumina bearer token not configured. Set LUMINA_BEARER_TOKEN env var or add 'bearerToken' to lumina-config.json"
    );
  }

  return { endpoint, bearerToken };
}
