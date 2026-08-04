import type {
  ContainerInfo,
  DeploymentConfig,
  DeploymentDiagnostics,
  DeploymentState,
  DockerCheckResult,
  ErrorCategory,
  HealthCheckResult,
  MigrationStatus,
} from "./types.js";
import { MANAGER_VERSION, STATE_USER_MESSAGES } from "./types.js";

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

export function errorGuidance(category: ErrorCategory | null | undefined): {
  message: string;
  nextStep: string;
} {
  switch (category) {
    case "docker_missing":
      return {
        message:
          "LibreVS requires Docker. Install Docker Desktop, then select Retry.",
        nextStep: "Install Docker Desktop and open it before retrying.",
      };
    case "daemon_stopped":
      return {
        message:
          "Docker is installed but is not running. Start Docker Desktop, then select Retry.",
        nextStep: "Start Docker Desktop and wait until it is fully running.",
      };
    case "compose_missing":
      return {
        message: "Docker Compose is required but was not found.",
        nextStep: "Reinstall Docker Desktop with the Compose plugin enabled.",
      };
    case "project_missing":
    case "compose_not_found":
    case "invalid_project":
      return {
        message:
          "The LibreVS installation folder is missing or invalid.",
        nextStep:
          "Choose the folder that contains the LibreVS docker-compose.yml file.",
      };
    case "first_build_failed":
      return {
        message: "Building LibreVS for the first time failed.",
        nextStep: "Check diagnostics, confirm Docker has disk space, then Retry.",
      };
    case "container_startup_failed":
      return {
        message: "LibreVS containers could not be started.",
        nextStep: "View diagnostics, then Retry. Advanced users may check Docker logs.",
      };
    case "database_unavailable":
      return {
        message: "LibreVS started but the database is not reachable yet.",
        nextStep: "Wait a moment and Retry. First startup can take several minutes.",
      };
    case "health_timeout":
      return {
        message: "LibreVS is taking longer than expected.",
        nextStep: "View diagnostics. On first start, wait for the build to finish.",
      };
    case "remote_unreachable":
      return {
        message: "Could not reach the configured LibreVS URL.",
        nextStep: "Check the URL, VPN, and firewall, then Retry.",
      };
    case "url_invalid":
      return {
        message: "The application URL is invalid.",
        nextStep: "Use an http:// or https:// address only.",
      };
    case "config_corrupt":
      return {
        message: "Deployment configuration could not be read.",
        nextStep: "Complete setup again.",
      };
    case "migration_degraded":
      return {
        message: "LibreVS responded but may need database attention.",
        nextStep: "View diagnostics. An administrator may need to apply migrations.",
      };
    case "permissions":
      return {
        message: "Insufficient permissions to manage LibreVS.",
        nextStep: "Run Deployment Manager with access to Docker.",
      };
    default:
      return {
        message: "An unexpected error occurred.",
        nextStep: "View diagnostics, then Retry.",
      };
  }
}

export function buildDiagnostics(input: {
  state: DeploymentState;
  config: DeploymentConfig;
  managerVersion?: string | null;
  dockerCheck?: DockerCheckResult | null;
  health?: HealthCheckResult | null;
  containers?: ContainerInfo[];
  error?: string | null;
  errorCategory?: ErrorCategory | null;
  lastOperation?: string | null;
}): DeploymentDiagnostics {
  const {
    state,
    config,
    managerVersion,
    dockerCheck,
    health,
    containers = [],
    error,
    errorCategory,
    lastOperation,
  } = input;

  const guidance = errorGuidance(errorCategory);
  const dockerRunning =
    dockerCheck == null
      ? null
      : dockerCheck.installed && dockerCheck.daemonRunning;

  const primaryContainer = containers.find((c) => c.service === "app");
  const dbContainer = containers.find((c) => c.service === "db");

  return {
    deploymentState: state,
    userMessage: error ? guidance.message : STATE_USER_MESSAGES[state],
    managerVersion: managerVersion ?? MANAGER_VERSION,
    dockerRunning,
    databaseRunning: health?.data?.databaseReachable ?? null,
    librevsRunning: health?.ready ?? (health?.reachable ? false : null),
    applicationUrl: config.targetUrl,
    librevsVersion: health?.data?.appVersion ?? null,
    schemaVersion: health?.data?.schemaVersion ?? null,
    migrationStatus: inferMigrationStatus(health ?? null),
    containerUptime: primaryContainer?.uptime ?? dbContainer?.uptime ?? null,
    containers,
    projectDirectory: config.composeProjectDir || null,
    lastHealthCheck: health ? new Date().toISOString() : null,
    lastOperation: lastOperation ?? null,
    error: error ?? null,
    errorCategory: errorCategory ?? null,
    nextStep: error ? guidance.nextStep : null,
    technicalDetails: sanitizeDetails({
      docker: dockerCheck ?? null,
      health: health?.data ?? null,
      healthHttpStatus: health?.httpStatus ?? null,
      healthError: health?.error ?? null,
      composeProjectDir: config.composeProjectDir,
      mode: config.mode,
      managerVersion: managerVersion ?? MANAGER_VERSION,
    }),
  };
}

export function sanitizeDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const blocked = /(password|secret|token|apikey|api_key|database_url|credentials)/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (blocked.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeDetails(value as Record<string, unknown>);
    } else if (typeof value === "string" && blocked.test(value)) {
      out[key] = "[redacted]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function diagnosticsText(d: DeploymentDiagnostics): string {
  const lines = [
    `LibreVS Deployment Manager ${d.managerVersion ?? ""}`,
    `State: ${d.deploymentState}`,
    `Mode: ${d.technicalDetails.mode ?? ""}`,
    `URL: ${d.applicationUrl}`,
    `Project: ${d.projectDirectory ?? "—"}`,
    `Docker: ${stringifyFlag(d.dockerRunning)}`,
    `Database: ${stringifyFlag(d.databaseRunning)}`,
    `LibreVS: ${stringifyFlag(d.librevsRunning)}`,
    `App version: ${d.librevsVersion ?? "—"}`,
    `Schema: ${d.schemaVersion ?? "—"}`,
    `Migration: ${d.migrationStatus}`,
    `Last operation: ${d.lastOperation ?? "—"}`,
    `Last health check: ${d.lastHealthCheck ?? "—"}`,
    `Error: ${d.error ?? "—"}`,
    `Category: ${d.errorCategory ?? "—"}`,
    "",
    "Technical details:",
    JSON.stringify(d.technicalDetails, null, 2),
  ];
  return lines.join("\n");
}

function stringifyFlag(value: boolean | null): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}
