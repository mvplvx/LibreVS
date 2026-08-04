import type { DeploymentBridge } from "./bridge.js";
import { detectBridge } from "./bridge.js";
import { buildDiagnostics, errorGuidance } from "./diagnostics.js";
import { fetchSystemHealth, isDatabaseReady, waitForHealth } from "./health.js";
import type {
  DeploymentConfig,
  DeploymentManagerSnapshot,
  DeploymentState,
  DockerCheckResult,
  ErrorCategory,
  HealthCheckResult,
} from "./types.js";
import {
  CONNECT_TIMEOUT_MS,
  DOCKER_START_TIMEOUT_MS,
  HEALTH_POLL_INITIAL_MS,
  HEALTH_POLL_MAX_MS,
  isSafeHttpUrl,
  managesLocalDocker,
  STARTUP_TIMEOUT_MS,
  STATE_USER_MESSAGES,
} from "./types.js";

export type DeploymentManagerListener = (
  snapshot: DeploymentManagerSnapshot
) => void;

export type DeploymentManagerOptions = {
  bridge?: DeploymentBridge;
  startupTimeoutMs?: number;
  connectTimeoutMs?: number;
  dockerStartTimeoutMs?: number;
  healthPollInitialMs?: number;
  healthPollMaxMs?: number;
};

export class DeploymentManager {
  private config: DeploymentConfig;
  private state: DeploymentState = "IDLE";
  private bridge: DeploymentBridge;
  private listeners = new Set<DeploymentManagerListener>();
  private abortStart = false;
  private lastHealth: HealthCheckResult | null = null;
  private lastDocker: DockerCheckResult | null = null;
  private lastError: string | null = null;
  private lastErrorCategory: ErrorCategory | null = null;
  private lastOperation: string | null = null;
  private browserOpenedForStartup = false;
  private operationLock = false;
  private managerVersion: string | null = null;
  private initialized = false;
  private startupTimeoutMs: number;
  private connectTimeoutMs: number;
  private dockerStartTimeoutMs: number;
  private healthPollInitialMs: number;
  private healthPollMaxMs: number;

  constructor(bridgeOrOptions: DeploymentBridge | DeploymentManagerOptions = detectBridge()) {
    if (typeof bridgeOrOptions === "object" && bridgeOrOptions !== null && "checkDocker" in bridgeOrOptions) {
      this.bridge = bridgeOrOptions as DeploymentBridge;
      this.startupTimeoutMs = STARTUP_TIMEOUT_MS;
      this.connectTimeoutMs = CONNECT_TIMEOUT_MS;
      this.dockerStartTimeoutMs = DOCKER_START_TIMEOUT_MS;
      this.healthPollInitialMs = HEALTH_POLL_INITIAL_MS;
      this.healthPollMaxMs = HEALTH_POLL_MAX_MS;
    } else {
      const options = bridgeOrOptions as DeploymentManagerOptions;
      this.bridge = options.bridge ?? detectBridge();
      this.startupTimeoutMs = options.startupTimeoutMs ?? STARTUP_TIMEOUT_MS;
      this.connectTimeoutMs = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
      this.dockerStartTimeoutMs = options.dockerStartTimeoutMs ?? DOCKER_START_TIMEOUT_MS;
      this.healthPollInitialMs = options.healthPollInitialMs ?? HEALTH_POLL_INITIAL_MS;
      this.healthPollMaxMs = options.healthPollMaxMs ?? HEALTH_POLL_MAX_MS;
    }
    this.config = {
      mode: "personal",
      targetUrl: "http://localhost:3000",
      composeProjectDir: "",
      autoOpenBrowser: true,
      autoStartOnOpen: true,
      setupComplete: false,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.managerVersion = await this.bridge.getManagerVersion();
      this.config = await this.bridge.loadConfig();
      if (!this.config.setupComplete) {
        this.state = "SETUP";
      } else {
        this.state = "IDLE";
      }
    } catch {
      this.state = "SETUP";
      this.lastErrorCategory = "config_corrupt";
      const g = errorGuidance("config_corrupt");
      this.lastError = g.message;
    }
    this.initialized = true;
    this.emit();

    if (
      this.config.setupComplete &&
      this.config.autoStartOnOpen &&
      this.config.mode !== "organization-connect"
    ) {
      void this.start();
    }
  }

  getSnapshot(): DeploymentManagerSnapshot {
    return this.buildSnapshot();
  }

  subscribe(listener: DeploymentManagerListener): () => void {
    this.listeners.add(listener);
    if (this.initialized) {
      listener(this.getSnapshot());
    }
    return () => this.listeners.delete(listener);
  }

  needsSetup(): boolean {
    return !this.config.setupComplete || this.state === "SETUP";
  }

  getConfig(): DeploymentConfig {
    return this.config;
  }

  async completeSetup(config: DeploymentConfig): Promise<void> {
    if (!isSafeHttpUrl(config.targetUrl)) {
      throw new Error(errorGuidance("url_invalid").message);
    }
    if (managesLocalDocker(config)) {
      const validation = await this.bridge.validateProject(
        config.composeProjectDir
      );
      if (!validation.ok) {
        throw new Error(validation.error ?? errorGuidance("invalid_project").message);
      }
      config = { ...config, composeProjectDir: validation.path };
    } else {
      config = { ...config, composeProjectDir: "" };
    }

    if (
      config.mode === "organization-host" &&
      /localhost|127\.0\.0\.1/i.test(config.targetUrl)
    ) {
      throw new Error(
        "Organization-host mode requires a non-localhost application URL."
      );
    }

    const toSave: DeploymentConfig = {
      ...config,
      setupComplete: true,
      autoStartOnOpen:
        config.mode === "organization-connect"
          ? false
          : config.autoStartOnOpen,
    };
    this.config = await this.bridge.saveConfig(toSave);
    this.state = "IDLE";
    this.lastError = null;
    this.lastErrorCategory = null;
    this.emit();
    await this.start();
  }

  async pickProjectDirectory(): Promise<string | null> {
    return this.bridge.pickDirectory();
  }

  async validateProjectDirectory(path: string) {
    return this.bridge.validateProject(path);
  }

  async updateConfig(partial: Partial<DeploymentConfig>): Promise<void> {
    const next = { ...this.config, ...partial };
    if (next.mode === "personal") {
      next.targetUrl = "http://localhost:3000";
    }
    if (
      this.config.mode === "personal" &&
      next.mode === "organization-host" &&
      /localhost|127\.0\.0\.1/i.test(next.targetUrl)
    ) {
      next.targetUrl = "";
      next.setupComplete = false;
    }
    if (next.mode === "organization-connect") {
      next.composeProjectDir = "";
      next.autoStartOnOpen = false;
    }
    this.config = await this.bridge.saveConfig(next);
    if (!this.config.setupComplete) {
      this.state = "SETUP";
    }
    this.emit();
  }

  async resetSetup(): Promise<void> {
    this.config = await this.bridge.resetConfig();
    this.state = "SETUP";
    this.lastError = null;
    this.lastErrorCategory = null;
    this.emit();
  }

  async start(): Promise<void> {
    if (this.operationLock) return;
    this.operationLock = true;
    this.abortStart = false;
    this.browserOpenedForStartup = false;
    this.lastError = null;
    this.lastErrorCategory = null;
    this.lastOperation = "start";

    try {
      if (!this.config.setupComplete) {
        this.state = "SETUP";
        this.emit();
        return;
      }
      await this.runStartupFlow();
    } catch (err) {
      this.state = "ERROR";
      this.lastError =
        err instanceof Error ? err.message : errorGuidance("unknown").message;
      this.lastErrorCategory = this.lastErrorCategory ?? "unknown";
      this.emit();
    } finally {
      this.operationLock = false;
      this.emit();
    }
  }

  async stop(): Promise<void> {
    if (this.operationLock) return;
    if (!managesLocalDocker(this.config)) {
      this.state = "IDLE";
      this.lastHealth = null;
      this.emit();
      return;
    }

    this.operationLock = true;
    this.abortStart = true;
    this.state = "STOPPING";
    this.lastOperation = "stop";
    this.lastError = null;
    this.emit();

    try {
      await this.bridge.composeDown(this.config.composeProjectDir);
      this.state = "IDLE";
      this.lastHealth = null;
    } catch (err) {
      this.state = "ERROR";
      this.lastErrorCategory = "container_startup_failed";
      this.lastError =
        err instanceof Error ? err.message : "Failed to stop LibreVS.";
    } finally {
      this.operationLock = false;
      this.emit();
    }
  }

  async restart(): Promise<void> {
    if (this.operationLock) return;
    if (!managesLocalDocker(this.config)) return;

    this.operationLock = true;
    this.abortStart = false;
    this.browserOpenedForStartup = false;
    this.state = "RESTARTING";
    this.lastOperation = "restart";
    this.lastError = null;
    this.emit();

    try {
      await this.bridge.composeRestart(this.config.composeProjectDir);
      await this.waitForLibreVsReady();
    } catch (err) {
      this.state = "ERROR";
      this.lastErrorCategory = "container_startup_failed";
      this.lastError =
        err instanceof Error ? err.message : "Failed to restart LibreVS.";
      this.emit();
    } finally {
      this.operationLock = false;
      this.emit();
    }
  }

  async openLibreVs(): Promise<void> {
    if (!isSafeHttpUrl(this.config.targetUrl)) {
      this.lastErrorCategory = "url_invalid";
      this.lastError = errorGuidance("url_invalid").message;
      this.state = "ERROR";
      this.emit();
      return;
    }
    await this.bridge.openUrl(this.config.targetUrl);
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

    const validation = await this.bridge.validateProject(
      this.config.composeProjectDir
    );
    if (!validation.ok) {
      this.fail(
        (validation.errorCode as ErrorCategory) ?? "invalid_project",
        validation.error
      );
      return;
    }
    if (validation.path !== this.config.composeProjectDir) {
      this.config = await this.bridge.saveConfig({
        ...this.config,
        composeProjectDir: validation.path,
      });
    }

    this.setState("CHECKING_DOCKER");
    let dockerCheck = await this.bridge.checkDocker();
    this.lastDocker = dockerCheck;

    if (!dockerCheck.installed) {
      this.fail("docker_missing", dockerCheck.error);
      return;
    }
    if (!dockerCheck.composeAvailable && dockerCheck.daemonRunning) {
      this.fail("compose_missing", dockerCheck.error);
      return;
    }

    if (!dockerCheck.daemonRunning) {
      this.setState("STARTING_DOCKER");
      const launched = await this.bridge.startDockerDesktop();
      if (launched) {
        dockerCheck = await this.waitForDockerDaemon();
        this.lastDocker = dockerCheck;
      }
      if (!dockerCheck.daemonRunning) {
        this.fail("daemon_stopped", dockerCheck.error);
        return;
      }
      if (!dockerCheck.composeAvailable) {
        this.fail("compose_missing", dockerCheck.error);
        return;
      }
    }

    // Already healthy?
    const existing = await fetchSystemHealth(this.config.targetUrl);
    this.lastHealth = existing;
    if (existing.ready) {
      this.state = "RUNNING";
      this.emit();
      await this.maybeOpenBrowser();
      return;
    }

    this.setState("CHECKING_INSTALLATION");
    const images = await this.bridge.inspectImages(this.config.composeProjectDir);
    const running = await this.bridge.containersRunning(
      this.config.composeProjectDir
    );

    if (!running) {
      const needBuild = !images.appImagePresent;
      if (needBuild) {
        this.setState("BUILDING_FIRST_TIME");
      } else {
        this.setState("STARTING_CONTAINERS");
      }
      try {
        await this.bridge.composeUp(this.config.composeProjectDir, needBuild);
      } catch (err) {
        this.fail(
          needBuild ? "first_build_failed" : "container_startup_failed",
          err instanceof Error ? err.message : undefined
        );
        return;
      }
    }

    await this.waitForLibreVsReady();
  }

  private async waitForDockerDaemon(): Promise<DockerCheckResult> {
    const started = Date.now();
    let last = await this.bridge.checkDocker();
    while (Date.now() - started < this.dockerStartTimeoutMs) {
      if (this.abortStart) return last;
      last = await this.bridge.checkDocker();
      this.lastDocker = last;
      this.emit();
      if (last.daemonRunning && last.composeAvailable) {
        return last;
      }
      await sleep(2000);
    }
    return last;
  }

  private async connectOnlyFlow(): Promise<void> {
    this.setState("WAITING_FOR_LIBREVS");
    if (!isSafeHttpUrl(this.config.targetUrl)) {
      this.fail("url_invalid");
      return;
    }

    const health = await waitForHealth(this.config.targetUrl, {
      timeoutMs: this.connectTimeoutMs,
      initialIntervalMs: this.healthPollInitialMs,
      maxIntervalMs: this.healthPollMaxMs,
      onPoll: (h) => {
        this.lastHealth = h;
        this.emit();
      },
      shouldAbort: () => this.abortStart,
    });

    if (this.abortStart) return;
    this.lastHealth = health;

    if (!health.reachable) {
      this.fail("remote_unreachable", health.error);
      return;
    }
    if (health.ready) {
      this.state = "RUNNING";
      this.emit();
      await this.maybeOpenBrowser();
      return;
    }
    this.fail(health.category ?? "health_timeout", health.error);
  }

  private async waitForLibreVsReady(): Promise<void> {
    this.setState("WAITING_FOR_DATABASE");

    const health = await waitForHealth(this.config.targetUrl, {
      timeoutMs: this.startupTimeoutMs,
      initialIntervalMs: this.healthPollInitialMs,
      maxIntervalMs: this.healthPollMaxMs,
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

    let containers: Awaited<ReturnType<DeploymentBridge["composePs"]>> = [];
    try {
      containers = await this.bridge.composePs(this.config.composeProjectDir);
    } catch {
      containers = [];
    }

    if (health.ready) {
      this.state = "RUNNING";
      this.emitDiagnostics({ health, containers });
      await this.maybeOpenBrowser();
      return;
    }

    this.fail(health.category ?? "health_timeout", health.error);
    this.emitDiagnostics({ health, containers });
  }

  private async maybeOpenBrowser(): Promise<void> {
    if (!this.config.autoOpenBrowser) return;
    if (this.browserOpenedForStartup) return;
    if (!isSafeHttpUrl(this.config.targetUrl)) return;
    this.browserOpenedForStartup = true;
    try {
      await this.bridge.openUrl(this.config.targetUrl);
    } catch {
      /* best-effort */
    }
  }

  private fail(category: ErrorCategory, detail?: string | null): void {
    this.state = "ERROR";
    this.lastErrorCategory = category;
    const g = errorGuidance(category);
    this.lastError = detail?.trim() ? detail : g.message;
    this.emit();
  }

  private setState(state: DeploymentState): void {
    this.state = state;
    this.emit();
  }

  private emitDiagnostics(
    extra: Partial<{
      dockerCheck: DockerCheckResult | null;
      health: HealthCheckResult | null;
      containers: Awaited<ReturnType<DeploymentBridge["composePs"]>>;
    }>
  ): void {
    this.emit(extra);
  }

  private buildSnapshot(
    extra?: Partial<{
      dockerCheck: DockerCheckResult | null;
      health: HealthCheckResult | null;
      containers: Awaited<ReturnType<DeploymentBridge["composePs"]>>;
    }>
  ): DeploymentManagerSnapshot {
    const diagnostics = buildDiagnostics({
      state: this.state,
      config: this.config,
      managerVersion: this.managerVersion,
      dockerCheck: extra?.dockerCheck ?? this.lastDocker,
      health: extra?.health ?? this.lastHealth,
      containers: extra?.containers,
      error: this.lastError,
      errorCategory: this.lastErrorCategory,
      lastOperation: this.lastOperation,
    });
    return {
      state: this.state,
      userMessage: this.lastError
        ? diagnostics.userMessage
        : STATE_USER_MESSAGES[this.state],
      diagnostics,
      config: this.config,
      needsSetup: !this.config.setupComplete || this.state === "SETUP",
    };
  }

  private emit(
    extra?: Partial<{
      dockerCheck: DockerCheckResult | null;
      health: HealthCheckResult | null;
      containers: Awaited<ReturnType<DeploymentBridge["composePs"]>>;
    }>
  ): void {
    const snapshot = this.buildSnapshot(extra);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { modeLabel, managesLocalDocker, defaultConfig } from "./types.js";
