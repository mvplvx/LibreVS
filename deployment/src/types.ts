/** Deployment mode profiles. */
export type DeploymentMode =
  | "personal"
  | "organization-host"
  | "organization-connect";

export type DeploymentState =
  | "IDLE"
  | "SETUP"
  | "CHECKING_ENVIRONMENT"
  | "CHECKING_DOCKER"
  | "STARTING_DOCKER"
  | "CHECKING_INSTALLATION"
  | "BUILDING_FIRST_TIME"
  | "STARTING_CONTAINERS"
  | "WAITING_FOR_DATABASE"
  | "WAITING_FOR_LIBREVS"
  | "RUNNING"
  | "STOPPING"
  | "RESTARTING"
  | "ERROR";

export type ErrorCategory =
  | "docker_missing"
  | "daemon_stopped"
  | "compose_missing"
  | "project_missing"
  | "invalid_project"
  | "compose_not_found"
  | "first_build_failed"
  | "container_startup_failed"
  | "database_unavailable"
  | "health_timeout"
  | "remote_unreachable"
  | "url_invalid"
  | "permissions"
  | "config_corrupt"
  | "migration_degraded"
  | "unknown";

export type DeploymentConfig = {
  mode: DeploymentMode;
  targetUrl: string;
  composeProjectDir: string;
  autoOpenBrowser: boolean;
  autoStartOnOpen: boolean;
  setupComplete: boolean;
};

export type DockerCheckResult = {
  installed: boolean;
  daemonRunning: boolean;
  composeAvailable: boolean;
  dockerVersion?: string | null;
  composeVersion?: string | null;
  error?: string | null;
  errorCode?: string | null;
};

export type ContainerInfo = {
  name: string;
  service: string;
  state: string;
  status: string;
  uptime?: string | null;
};

export type SystemHealthData = {
  status: "ok" | "degraded" | "error" | string;
  schemaVersion: string;
  appVersion: string;
  databaseReachable: boolean;
  releaseCandidate?: string;
  registry?: { fieldCount: number; ok: boolean };
  legacyFieldsDetected?: boolean;
  warnings?: string[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type HealthCheckResult = {
  reachable: boolean;
  ready: boolean;
  data?: SystemHealthData;
  httpStatus?: number;
  error?: string;
  category?: ErrorCategory;
};

export type MigrationStatus = "ok" | "degraded" | "error" | "unknown";

export type DeploymentDiagnostics = {
  deploymentState: DeploymentState;
  userMessage: string;
  managerVersion: string | null;
  dockerRunning: boolean | null;
  databaseRunning: boolean | null;
  librevsRunning: boolean | null;
  applicationUrl: string;
  librevsVersion: string | null;
  schemaVersion: string | null;
  migrationStatus: MigrationStatus;
  containerUptime: string | null;
  containers: ContainerInfo[];
  projectDirectory: string | null;
  lastHealthCheck: string | null;
  lastOperation: string | null;
  error: string | null;
  errorCategory: ErrorCategory | null;
  nextStep: string | null;
  technicalDetails: Record<string, unknown>;
};

export type DeploymentManagerSnapshot = {
  state: DeploymentState;
  userMessage: string;
  diagnostics: DeploymentDiagnostics;
  config: DeploymentConfig;
  needsSetup: boolean;
};

export const STATE_USER_MESSAGES: Record<DeploymentState, string> = {
  IDLE: "Ready to start LibreVS",
  SETUP: "Complete setup to continue",
  CHECKING_ENVIRONMENT: "Checking your system…",
  CHECKING_DOCKER: "Checking container runtime…",
  STARTING_DOCKER: "Starting Docker…",
  CHECKING_INSTALLATION: "Checking installation…",
  BUILDING_FIRST_TIME: "Building LibreVS for the first time…",
  STARTING_CONTAINERS: "Starting LibreVS…",
  WAITING_FOR_DATABASE: "Starting database…",
  WAITING_FOR_LIBREVS: "Waiting for LibreVS…",
  RUNNING: "LibreVS is ready",
  STOPPING: "Stopping LibreVS…",
  RESTARTING: "Restarting LibreVS…",
  ERROR: "Something needs your attention",
};

export const DEFAULT_TARGET_URL = "http://localhost:3000";
export const HEALTH_POLL_INITIAL_MS = 2000;
export const HEALTH_POLL_MAX_MS = 30000;
export const STARTUP_TIMEOUT_MS = 5 * 60 * 1000;
export const CONNECT_TIMEOUT_MS = 2 * 60 * 1000;
export const DOCKER_START_TIMEOUT_MS = 2 * 60 * 1000;
export const MANAGER_VERSION = "0.8.0";

export function defaultConfig(): DeploymentConfig {
  return {
    mode: "personal",
    targetUrl: DEFAULT_TARGET_URL,
    composeProjectDir: "",
    autoOpenBrowser: true,
    autoStartOnOpen: true,
    setupComplete: false,
  };
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

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
