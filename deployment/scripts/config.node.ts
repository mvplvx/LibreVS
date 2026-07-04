import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DeploymentConfig } from "../src/types.js";
import { defaultConfig, normalizeConfig } from "../src/environment.js";

const CONFIG_DIR = path.join(os.homedir(), ".config", "librevs");
const CONFIG_FILE = path.join(CONFIG_DIR, "deployment.json");

/** Repo root when running smoke scripts from deployment/. */
export function defaultRepoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function getNodeConfigPath(): string {
  return CONFIG_FILE;
}

export function loadNodeConfig(): DeploymentConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const config = defaultConfig();
      config.composeProjectDir = defaultRepoRoot();
      return config;
    }
    const parsed = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf8")
    ) as Partial<DeploymentConfig>;
    return normalizeConfig({ ...defaultConfig(), ...parsed });
  } catch {
    return defaultConfig();
  }
}

export function saveNodeConfig(config: DeploymentConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(normalizeConfig(config), null, 2));
}

export function nodeComposeFileExists(config: DeploymentConfig): boolean {
  return fs.existsSync(
    path.join(config.composeProjectDir, "docker-compose.yml")
  );
}
