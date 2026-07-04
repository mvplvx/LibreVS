import {
  composeFileExists,
  loadConfig,
  managesLocalDocker,
  saveConfig,
} from "./environment.js";
import {
  buildDiagnostics,
  friendlyErrorMessage,
} from "./diagnostics.js";
import { fetchSystemHealth, isDatabaseReady, waitForHealth } from "./health.js";
import type { DeploymentPlatform } from "./platform.js";
import { detectPlatform } from "./platform.js";
import type {
  DeploymentConfig,
  DeploymentManagerSnapshot,
  DeploymentState,
  HealthCheckResult,
} from "./types.js";
import {
  HEALTH_POLL_INITIAL_MS,
  HEALTH_POLL_MAX_MS,
  STARTUP_TIMEOUT_MS,
  STATE_USER_MESSAGES,
} from "./types.js";

export type DeploymentManagerListener = (
  snapshot: DeploymentManagerSnapshot
) => void;

export class DeploymentManager {
  private config: DeploymentConfig;
  private state: DeploymentState = "IDLE";
  private platform: DeploymentPlatform;
  private listeners = new Set<DeploymentManagerListener>();
  private abortStart = false;
  private lastHealth: HealthCheckResult | null = null;
  private lastError: string | null = null;
  private browserOpened = false;

  constructor(
    config?: DeploymentConfig,
    platform: DeploymentPlatform = detectPlatform()
  ) {
    this.config = config ?? loadConfig();
    this.platform = platform;
  }

  getSnapshot(): DeploymentManagerSnapshot {
    return {
      state: this.state,
      userMessage: this.lastError ?? STATE_USER_MESSAGES[this.state],
      diagnostics: buildDiagnostics({
        state: this.state,
        config: this.config,
        health: this.lastHealth,
        error: this.lastError,
      }),
      config: this.config,
    };
  }

  subscribe(listener: DeploymentManagerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  updateConfig(partial: Partial<DeploymentConfig>): void {
    this.config = { ...this.config, ...partial };
    saveConfig(this.config);
    this.emit();
  }

  getConfig(): DeploymentConfig {
    return this.config;
  }

  async refresh(): Promise<void> {
    const health = await fetchSystemHealth(this.config.targetUrl);
    this.lastHealth = health;
    if (health.ready) {
      this.state = "RUNNING";
      this.lastError = null;
    }
    this.emit();
  }

  async start(): Promise<void> {
    this.abortStart = false;
    this.browserOpened = false;
    this.lastError = null;

    try {
      await this.runStartupFlow();
    } catch (err) {
      this.state = "ERROR";
      this.lastError =
        err instanceof Error ? err.message : friendlyErrorMessage(undefined);
      this.emit();
    }
  }

  async stop(): Promise<void> {
    if (!managesLocalDocker(this.config)) {
      this.state = "IDLE";
      this.lastHealth = null;
      this.emit();
      return;
    }

    this.state = "STOPPING";
    this.lastError = null;
    this.emit();

    try {
      await this.platform.composeDown(this.config.composeProjectDir);
      this.state = "IDLE";
      this.lastHealth = null;
    } catch (err) {
      this.state = "ERROR";
      this.lastError =
        err instanceof Error ? err.message : "Failed to stop LibreVS.";
    }
    this.emit();
  }

  async openLibreVs(openFn?: (url: string) => Promise<void>): Promise<void> {
    const url = this.config.targetUrl;
    if (openFn) {
      await openFn(url);
    } else {
      const { openBrowserUniversal } = await import("./browser.js");
      await openBrowserUniversal(url);
    }
  }

  cancel(): void {
    this.abortStart = true;
  }

  private async runStartupFlow(): Promise<void> {
    this.setState("CHECKING_ENVIRONMENT");

    if (this.config.mode === "organization-connect") {
      await this.connectOnlyFlow();
      return;
    }

    if (!(await composeFileExists(this.config))) {
      this.state = "ERROR";
      this.lastError = friendlyErrorMessage("compose_not_found");
      this.emit();
      return;
    }

    this.setState("CHECKING_DOCKER");
    const dockerCheck = await this.platform.checkDocker();
    if (!dockerCheck.installed || !dockerCheck.daemonRunning || !dockerCheck.composeAvailable) {
      this.state = "ERROR";
      this.lastError = friendlyErrorMessage(
        dockerCheck.errorCode,
        dockerCheck.error
      );
      this.emitDiagnostics({ dockerCheck });
      return;
    }

    const running = await this.platform.areContainersRunning(
      this.config.composeProjectDir
    );

    if (!running) {
      this.setState("STARTING_CONTAINERS");
      await this.platform.composeUp(this.config.composeProjectDir);
    }

    await this.waitForLibreVsReady();
  }

  private async connectOnlyFlow(): Promise<void> {
    this.setState("WAITING_FOR_LIBREVS");
    const health = await waitForHealth(this.config.targetUrl, {
      timeoutMs: 30_000,
      initialIntervalMs: HEALTH_POLL_INITIAL_MS,
      maxIntervalMs: HEALTH_POLL_MAX_MS,
      onPoll: (h) => {
        this.lastHealth = h;
        this.emit();
      },
      shouldAbort: () => this.abortStart,
    });

    if (this.abortStart) return;

    if (!health.reachable) {
      this.state = "ERROR";
      this.lastError = friendlyErrorMessage(
        "remote_unreachable",
        health.error
      );
      this.emitDiagnostics({ health });
      return;
    }

    this.lastHealth = health;
    if (health.ready) {
      this.state = "RUNNING";
      this.lastError = null;
    } else {
      this.state = "ERROR";
      this.lastError =
        health.data?.status === "degraded"
          ? friendlyErrorMessage("migration_degraded")
          : friendlyErrorMessage("health_timeout", health.error);
    }
    this.emit();
  }

  private async waitForLibreVsReady(): Promise<void> {
    this.setState("WAITING_FOR_DATABASE");

    const health = await waitForHealth(this.config.targetUrl, {
      timeoutMs: STARTUP_TIMEOUT_MS,
      initialIntervalMs: HEALTH_POLL_INITIAL_MS,
      maxIntervalMs: HEALTH_POLL_MAX_MS,
      onPoll: (h) => {
        this.lastHealth = h;
        if (isDatabaseReady(h) && this.state === "WAITING_FOR_DATABASE") {
          this.setState("WAITING_FOR_LIBREVS");
        }
        this.emit();
      },
      shouldAbort: () => this.abortStart,
    });

    if (this.abortStart) return;

    this.lastHealth = health;
    const containers = await this.platform.composePs(
      this.config.composeProjectDir
    );

    if (health.ready) {
      this.state = "RUNNING";
      this.lastError = null;
      this.emitDiagnostics({ health, containers });

      if (this.config.autoOpenBrowser && !this.browserOpened) {
        this.browserOpened = true;
        try {
          await this.openLibreVs();
        } catch {
          /* browser open is best-effort */
        }
      }
      return;
    }

    this.state = "ERROR";
    this.lastError =
      health.data?.status === "degraded"
        ? friendlyErrorMessage("migration_degraded")
        : friendlyErrorMessage("health_timeout", health.error);
    this.emitDiagnostics({ health, containers });
  }

  private setState(state: DeploymentState): void {
    this.state = state;
    this.emit();
  }

  private emitDiagnostics(
    extra: Partial<{
      dockerCheck: Awaited<ReturnType<DeploymentPlatform["checkDocker"]>> | null;
      health: HealthCheckResult | null;
      containers: Awaited<ReturnType<DeploymentPlatform["composePs"]>>;
    }>
  ): void {
    this.emit(extra);
  }

  private emit(
    extra?: Partial<{
      dockerCheck: Awaited<ReturnType<DeploymentPlatform["checkDocker"]>> | null;
      health: HealthCheckResult | null;
      containers: Awaited<ReturnType<DeploymentPlatform["composePs"]>>;
    }>
  ): void {
    const snapshot: DeploymentManagerSnapshot = {
      state: this.state,
      userMessage: this.lastError ?? STATE_USER_MESSAGES[this.state],
      diagnostics: buildDiagnostics({
        state: this.state,
        config: this.config,
        dockerCheck: extra?.dockerCheck ?? null,
        health: extra?.health ?? this.lastHealth,
        containers: extra?.containers,
        error: this.lastError,
      }),
      config: this.config,
    };
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export { loadConfig, saveConfig, configForMode, modeLabel } from "./environment.js";
