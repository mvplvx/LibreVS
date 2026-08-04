import type {
  ContainerInfo,
  DeploymentConfig,
  DockerCheckResult,
} from "./types.js";
import { defaultConfig } from "./types.js";

export type AppImageStatus = {
  appImagePresent: boolean;
  servicesCreated: boolean;
};

export type ProjectValidation = {
  ok: boolean;
  path: string;
  composeFile: string;
  errorCode?: string | null;
  error?: string | null;
};

function isTauriRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "window" in globalThis &&
    "__TAURI_INTERNALS__" in (globalThis as { window?: object }).window!
  );
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

/** Platform operations — Tauri in production, injectable for tests. */
export type DeploymentBridge = {
  getManagerVersion: () => Promise<string>;
  loadConfig: () => Promise<DeploymentConfig>;
  saveConfig: (config: DeploymentConfig) => Promise<DeploymentConfig>;
  resetConfig: () => Promise<DeploymentConfig>;
  checkDocker: () => Promise<DockerCheckResult>;
  validateProject: (path: string) => Promise<ProjectValidation>;
  pickDirectory: () => Promise<string | null>;
  composeUp: (path: string, build: boolean) => Promise<void>;
  composeDown: (path: string) => Promise<void>;
  composeRestart: (path: string) => Promise<void>;
  composePs: (path: string) => Promise<ContainerInfo[]>;
  containersRunning: (path: string) => Promise<boolean>;
  inspectImages: (path: string) => Promise<AppImageStatus>;
  startDockerDesktop: () => Promise<boolean>;
  openUrl: (url: string) => Promise<void>;
};

export function createTauriBridge(): DeploymentBridge {
  return {
    getManagerVersion: () => invoke<string>("get_manager_version"),
    loadConfig: () => invoke<DeploymentConfig>("load_deployment_config"),
    saveConfig: (config) =>
      invoke<DeploymentConfig>("save_deployment_config", { config }),
    resetConfig: () => invoke<DeploymentConfig>("reset_deployment_config"),
    checkDocker: () => invoke<DockerCheckResult>("check_docker_status"),
    validateProject: (path) =>
      invoke<ProjectValidation>("validate_librevs_project", { path }),
    pickDirectory: () => invoke<string | null>("pick_librevs_directory"),
    composeUp: (path, build) =>
      invoke<void>("docker_compose_up", { path, build }),
    composeDown: (path) => invoke<void>("docker_compose_down", { path }),
    composeRestart: (path) => invoke<void>("docker_compose_restart", { path }),
    composePs: (path) => invoke<ContainerInfo[]>("docker_compose_ps", { path }),
    containersRunning: (path) =>
      invoke<boolean>("docker_containers_running", { path }),
    inspectImages: (path) =>
      invoke<AppImageStatus>("docker_inspect_images", { path }),
    startDockerDesktop: () => invoke<boolean>("start_docker_desktop"),
    openUrl: async (url) => {
      try {
        await invoke<void>("open_external_url", { url });
      } catch {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(url);
      }
    },
  };
}

/** Browser/dev stub — no Docker control (for Vite preview only). */
export function createBrowserStubBridge(): DeploymentBridge {
  let memory = defaultConfig();
  return {
    getManagerVersion: async () => "0.8.0-dev",
    loadConfig: async () => ({ ...memory }),
    saveConfig: async (config) => {
      memory = { ...config };
      return memory;
    },
    resetConfig: async () => {
      memory = defaultConfig();
      return memory;
    },
    checkDocker: async () => ({
      installed: false,
      daemonRunning: false,
      composeAvailable: false,
      errorCode: "docker_missing",
      error:
        "Container management requires the packaged LibreVS Deployment Manager.",
    }),
    validateProject: async (path) => ({
      ok: Boolean(path),
      path,
      composeFile: path ? `${path}/docker-compose.yml` : "",
      errorCode: path ? null : "project_missing",
      error: path ? null : "Select a folder",
    }),
    pickDirectory: async () => null,
    composeUp: async () => {
      throw new Error("Docker operations require the packaged desktop app.");
    },
    composeDown: async () => {
      throw new Error("Docker operations require the packaged desktop app.");
    },
    composeRestart: async () => {
      throw new Error("Docker operations require the packaged desktop app.");
    },
    composePs: async () => [],
    containersRunning: async () => false,
    inspectImages: async () => ({
      appImagePresent: false,
      servicesCreated: false,
    }),
    startDockerDesktop: async () => false,
    openUrl: async (url) => {
      const openFn = (globalThis as typeof globalThis & {
        open?: (url: string, target?: string, features?: string) => void;
      }).open;
      openFn?.(url, "_blank", "noopener,noreferrer");
    },
  };
}

export function detectBridge(): DeploymentBridge {
  if (isTauriRuntime()) {
    return createTauriBridge();
  }
  return createBrowserStubBridge();
}
