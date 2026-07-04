/** Deployment mode profiles. */
export type DeploymentMode =
  | "personal"
  | "organization-host"
  | "organization-connect";

export type DeploymentState =
  | "CHECKING_ENVIRONMENT"
  | "CHECKING_DOCKER"
  | "STARTING_CONTAINERS"
  | "WAITING_FOR_DATABASE"
  | "WAITING_FOR_LIBREVS"
  | "RUNNING"
  | "STOPPING"
  | "ERROR"
  | "IDLE";

export type DeploymentConfig = {
  mode: DeploymentMode;
  targetUrl: string;
  composeProjectDir: string;
  autoOpenBrowser: boolean;
};

export type DockerCheckResult = {
  installed: boolean;
  daemonRunning: boolean;
  composeAvailable: boolean;
  dockerVersion?: string;
  composeVersion?: string;
  error?: string;
  errorCode?: "docker_missing" | "daemon_stopped" | "compose_missing";
};

export type ContainerInfo = {
  name: string;
  service: string;
  state: string;
  status: string;
  uptime?: string;
};

export type SystemHealthData = {
  status: "ok" | "degraded" | "error";
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
};

export type MigrationStatus = "ok" | "degraded" | "error" | "unknown";

export type DeploymentDiagnostics = {
  deploymentState: DeploymentState;
  userMessage: string;
  dockerRunning: boolean | null;
  databaseRunning: boolean | null;
  librevsRunning: boolean | null;
  applicationUrl: string;
  librevsVersion: string | null;
  schemaVersion: string | null;
  migrationStatus: MigrationStatus;
  containerUptime: string | null;
  containers: ContainerInfo[];
  lastHealthCheck: string | null;
  error: string | null;
  technicalDetails: Record<string, unknown>;
};

export type DeploymentManagerSnapshot = {
  state: DeploymentState;
  userMessage: string;
  diagnostics: DeploymentDiagnostics;
  config: DeploymentConfig;
};

export const STATE_USER_MESSAGES: Record<DeploymentState, string> = {
  IDLE: "Ready to start LibreVS",
  CHECKING_ENVIRONMENT: "Checking your system…",
  CHECKING_DOCKER: "Checking container runtime…",
  STARTING_CONTAINERS: "Starting LibreVS…",
  WAITING_FOR_DATABASE: "Preparing database…",
  WAITING_FOR_LIBREVS: "Starting reporting platform…",
  RUNNING: "LibreVS is ready",
  STOPPING: "Stopping LibreVS…",
  ERROR: "Something needs your attention",
};

export const DEFAULT_TARGET_URL = "http://localhost:3000";
export const HEALTH_POLL_INITIAL_MS = 2000;
export const HEALTH_POLL_MAX_MS = 30000;
export const STARTUP_TIMEOUT_MS = 5 * 60 * 1000;
