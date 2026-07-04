import type { DeploymentConfig, DeploymentMode } from "./types.js";
import { DEFAULT_TARGET_URL } from "./types.js";

const STORAGE_KEY = "librevs-deployment-config";

type ConfigStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function getStorage(): ConfigStorage | null {
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return (globalThis as typeof globalThis & { localStorage: ConfigStorage })
      .localStorage;
  }
  return null;
}

/** Default LibreVS project directory when unset (configure in Deployment Manager). */
export function defaultComposeProjectDir(): string {
  return "";
}

export function defaultConfig(): DeploymentConfig {
  return {
    mode: "personal",
    targetUrl: DEFAULT_TARGET_URL,
    composeProjectDir: defaultComposeProjectDir(),
    autoOpenBrowser: true,
  };
}

export function configForMode(mode: DeploymentMode): DeploymentConfig {
  const base = defaultConfig();
  switch (mode) {
    case "personal":
      return {
        ...base,
        mode,
        targetUrl: DEFAULT_TARGET_URL,
        autoOpenBrowser: true,
      };
    case "organization-host":
      return {
        ...base,
        mode,
        autoOpenBrowser: false,
      };
    case "organization-connect":
      return {
        ...base,
        mode,
        autoOpenBrowser: false,
      };
  }
}

export function normalizeConfig(config: DeploymentConfig): DeploymentConfig {
  const targetUrl = config.targetUrl.trim().replace(/\/+$/, "");
  const composeProjectDir =
    config.composeProjectDir?.trim() || defaultComposeProjectDir();
  return {
    mode: config.mode,
    targetUrl: targetUrl || DEFAULT_TARGET_URL,
    composeProjectDir,
    autoOpenBrowser: config.autoOpenBrowser,
  };
}

export function composeFilePath(config: DeploymentConfig): string {
  return `${config.composeProjectDir.replace(/\/+$/, "")}/docker-compose.yml`;
}

export function managesLocalDocker(config: DeploymentConfig): boolean {
  return config.mode === "personal" || config.mode === "organization-host";
}

export function modeLabel(mode: DeploymentMode): string {
  switch (mode) {
    case "personal":
      return "Personal installation";
    case "organization-host":
      return "Organization — host server";
    case "organization-connect":
      return "Organization — connect to server";
  }
}

export function loadConfigFromStorage(): DeploymentConfig {
  const storage = getStorage();
  if (!storage) {
    return defaultConfig();
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return normalizeConfig({
      ...defaultConfig(),
      ...JSON.parse(raw),
    } as DeploymentConfig);
  } catch {
    return defaultConfig();
  }
}

export function saveConfigToStorage(config: DeploymentConfig): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeConfig(config)));
}

export function loadConfig(): DeploymentConfig {
  return loadConfigFromStorage();
}

export function saveConfig(config: DeploymentConfig): void {
  saveConfigToStorage(config);
}

export function getConfigPath(): string {
  return getStorage()
    ? `localStorage:${STORAGE_KEY}`
    : "~/.config/librevs/deployment.json";
}

function isTauriRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "window" in globalThis &&
    "__TAURI_INTERNALS__" in (globalThis as { window?: object }).window!
  );
}

export async function composeFileExists(config: DeploymentConfig): Promise<boolean> {
  if (isTauriRuntime()) {
    try {
      const { Command } = await import("@tauri-apps/plugin-shell");
      const cmd = Command.create("test", ["-f", composeFilePath(config)]);
      const output = await cmd.execute();
      return output.code === 0;
    } catch {
      return Boolean(config.composeProjectDir);
    }
  }
  return Boolean(config.composeProjectDir);
}
