import type {
  ContainerInfo,
  DeploymentConfig,
  DeploymentDiagnostics,
  DeploymentState,
  DockerCheckResult,
  HealthCheckResult,
  MigrationStatus,
} from "./types.js";
import { STATE_USER_MESSAGES } from "./types.js";

export function inferMigrationStatus(
  health: HealthCheckResult | null
): MigrationStatus {
  if (!health?.data) return "unknown";
  switch (health.data.status) {
    case "ok":
      return "ok";
    case "degraded":
      return "degraded";
    case "error":
      return "error";
    default:
      return "unknown";
  }
}

export function buildDiagnostics(input: {
  state: DeploymentState;
  config: DeploymentConfig;
  dockerCheck?: DockerCheckResult | null;
  health?: HealthCheckResult | null;
  containers?: ContainerInfo[];
  error?: string | null;
}): DeploymentDiagnostics {
  const { state, config, dockerCheck, health, containers = [], error } = input;

  const dockerRunning =
    dockerCheck == null
      ? null
      : dockerCheck.installed && dockerCheck.daemonRunning;

  const databaseRunning = health?.data?.databaseReachable ?? null;
  const librevsRunning = health?.ready ?? (health?.reachable ? false : null);

  const primaryContainer = containers.find((c) => c.service === "app");
  const dbContainer = containers.find((c) => c.service === "db");

  return {
    deploymentState: state,
    userMessage: error ? STATE_USER_MESSAGES.ERROR : STATE_USER_MESSAGES[state],
    dockerRunning,
    databaseRunning,
    librevsRunning,
    applicationUrl: config.targetUrl,
    librevsVersion: health?.data?.appVersion ?? null,
    schemaVersion: health?.data?.schemaVersion ?? null,
    migrationStatus: inferMigrationStatus(health ?? null),
    containerUptime: primaryContainer?.uptime ?? dbContainer?.uptime ?? null,
    containers,
    lastHealthCheck: health ? new Date().toISOString() : null,
    error: error ?? null,
    technicalDetails: {
      docker: dockerCheck ?? null,
      health: health?.data ?? null,
      healthHttpStatus: health?.httpStatus ?? null,
      healthError: health?.error ?? null,
      composeProjectDir: config.composeProjectDir,
      mode: config.mode,
    },
  };
}

export function friendlyErrorMessage(
  errorCode?: string,
  fallback?: string
): string {
  switch (errorCode) {
    case "docker_missing":
      return "LibreVS requires a container runtime. Install Docker Desktop to continue.";
    case "daemon_stopped":
      return "The container runtime is not running. Start Docker and try again.";
    case "compose_missing":
      return "Docker Compose is required but was not found.";
    case "compose_not_found":
      return "Could not find docker-compose.yml in the configured project directory.";
    case "health_timeout":
      return "LibreVS is taking longer than expected. View diagnostics for details.";
    case "remote_unreachable":
      return "Could not reach the configured LibreVS URL. Check the address, VPN, or firewall.";
    case "migration_degraded":
      return "LibreVS started but the database may need attention. View diagnostics.";
    default:
      return fallback ?? "An unexpected error occurred.";
  }
}
