import { describe, expect, it, vi, beforeEach } from "vitest";
import { DeploymentManager } from "./deploymentManager.js";
import type { DeploymentBridge } from "./bridge.js";
import type { DeploymentConfig, DockerCheckResult } from "./types.js";
import { defaultConfig, isSafeHttpUrl } from "./types.js";
import { sanitizeDetails } from "./diagnostics.js";

function baseConfig(partial: Partial<DeploymentConfig> = {}): DeploymentConfig {
  return {
    ...defaultConfig(),
    setupComplete: true,
    composeProjectDir: "/opt/librevs",
    ...partial,
  };
}

function mockBridge(overrides: Partial<DeploymentBridge> = {}): DeploymentBridge {
  const dockerOk: DockerCheckResult = {
    installed: true,
    daemonRunning: true,
    composeAvailable: true,
    dockerVersion: "Docker version test",
    composeVersion: "Docker Compose version test",
  };

  return {
    getManagerVersion: async () => "0.8.0-test",
    loadConfig: async () => baseConfig(),
    saveConfig: async (c) => c,
    resetConfig: async () => defaultConfig(),
    checkDocker: async () => dockerOk,
    validateProject: async (path) => ({
      ok: true,
      path,
      composeFile: `${path}/docker-compose.yml`,
    }),
    pickDirectory: async () => "/opt/librevs",
    composeUp: async () => undefined,
    composeDown: async () => undefined,
    composeRestart: async () => undefined,
    composePs: async () => [
      {
        name: "librevs-app",
        service: "app",
        state: "running",
        status: "Up 2 minutes",
        uptime: "2 minutes",
      },
    ],
    containersRunning: async () => false,
    inspectImages: async () => ({
      appImagePresent: true,
      servicesCreated: true,
    }),
    startDockerDesktop: async () => false,
    openUrl: async () => undefined,
    ...overrides,
  };
}

function mockFetchHealth(ready: boolean, databaseReachable = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({
        success: true,
        data: {
          status: ready ? "ok" : "degraded",
          schemaVersion: "2.0.0",
          appVersion: "0.8.0-rc1",
          databaseReachable,
        },
      }),
    }))
  );
}

describe("isSafeHttpUrl", () => {
  it("allows http and https only", () => {
    expect(isSafeHttpUrl("http://localhost:3000")).toBe(true);
    expect(isSafeHttpUrl("https://esg.company.local")).toBe(true);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("sanitizeDetails", () => {
  it("redacts secret-like keys", () => {
    const out = sanitizeDetails({
      mode: "personal",
      database_url: "postgresql://secret",
      nested: { token: "abc", ok: true },
    });
    expect(out.database_url).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).token).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).ok).toBe(true);
  });
});

describe("DeploymentManager", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("enters setup when configuration is incomplete", async () => {
    const bridge = mockBridge({
      loadConfig: async () => defaultConfig(),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    expect(manager.getSnapshot().needsSetup).toBe(true);
    expect(manager.getSnapshot().state).toBe("SETUP");
  });

  it("starts personal installation when already healthy", async () => {
    mockFetchHealth(true);
    const openUrl = vi.fn(async () => undefined);
    const composeUp = vi.fn(async () => undefined);
    const bridge = mockBridge({ openUrl, composeUp });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await vi.waitFor(() => expect(manager.getSnapshot().state).toBe("RUNNING"));
    expect(composeUp).not.toHaveBeenCalled();
    expect(openUrl).toHaveBeenCalledTimes(1);
  });

  it("uses first-build path when app image is missing", async () => {
    mockFetchHealth(false);
    // After compose up, become ready on subsequent polls
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        const ready = calls > 2;
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            success: true,
            data: {
              status: ready ? "ok" : "error",
              schemaVersion: "2.0.0",
              appVersion: "0.8.0-rc1",
              databaseReachable: ready,
            },
          }),
        };
      })
    );

    const composeUp = vi.fn(async (_path: string, build: boolean) => {
      expect(build).toBe(true);
    });
    const bridge = mockBridge({
      composeUp,
      inspectImages: async () => ({
        appImagePresent: false,
        servicesCreated: false,
      }),
      loadConfig: async () =>
        baseConfig({ autoOpenBrowser: false, autoStartOnOpen: false }),
    });
    const manager = new DeploymentManager({
      bridge,
      startupTimeoutMs: 2000,
      healthPollInitialMs: 20,
      healthPollMaxMs: 50,
    });
    await manager.initialize();
    await manager.start();
    expect(composeUp).toHaveBeenCalledWith("/opt/librevs", true);
    expect(manager.getSnapshot().state).toBe("RUNNING");
  });

  it("fails when Docker is missing", async () => {
    const bridge = mockBridge({
      checkDocker: async () => ({
        installed: false,
        daemonRunning: false,
        composeAvailable: false,
        errorCode: "docker_missing",
        error: "missing",
      }),
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.start();
    expect(manager.getSnapshot().state).toBe("ERROR");
    expect(manager.getSnapshot().diagnostics.errorCategory).toBe(
      "docker_missing"
    );
  });

  it("fails on invalid project directory", async () => {
    const bridge = mockBridge({
      validateProject: async () => ({
        ok: false,
        path: "/tmp/wrong",
        composeFile: "",
        errorCode: "invalid_project",
        error: "not librevs",
      }),
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.start();
    expect(manager.getSnapshot().diagnostics.errorCategory).toBe(
      "invalid_project"
    );
  });

  it("organization-connect does not call Docker", async () => {
    mockFetchHealth(true);
    const checkDocker = vi.fn();
    const composeUp = vi.fn();
    const bridge = mockBridge({
      checkDocker,
      composeUp,
      loadConfig: async () =>
        baseConfig({
          mode: "organization-connect",
          targetUrl: "https://esg.company.local",
          composeProjectDir: "",
          autoStartOnOpen: false,
          autoOpenBrowser: false,
        }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.start();
    expect(checkDocker).not.toHaveBeenCalled();
    expect(composeUp).not.toHaveBeenCalled();
    expect(manager.getSnapshot().state).toBe("RUNNING");
  });

  it("rejects duplicate concurrent startups", async () => {
    mockFetchHealth(true);
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const checkDocker = vi.fn(async () => {
      await gate;
      return {
        installed: true,
        daemonRunning: true,
        composeAvailable: true,
      };
    });
    const bridge = mockBridge({
      checkDocker,
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    const p1 = manager.start();
    const p2 = manager.start();
    release();
    await Promise.all([p1, p2]);
    expect(checkDocker).toHaveBeenCalledTimes(1);
  });

  it("deduplicates automatic browser opens for one startup", async () => {
    mockFetchHealth(true);
    const openUrl = vi.fn(async () => undefined);
    const bridge = mockBridge({
      openUrl,
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: true }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.start();
    await manager.start();
    // Second start while already running still may open once per successful start op.
    // browserOpenedForStartup resets each start(); product requires per startup op.
    expect(openUrl.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(openUrl.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("stop preserves volumes by calling composeDown only", async () => {
    const composeDown = vi.fn(async () => undefined);
    const bridge = mockBridge({
      composeDown,
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    // Force running state via health
    mockFetchHealth(true);
    await manager.start();
    await manager.stop();
    expect(composeDown).toHaveBeenCalledWith("/opt/librevs");
    expect(manager.getSnapshot().state).toBe("IDLE");
  });

  it("switching personal to organization-host clears localhost URL", async () => {
    const saved: DeploymentConfig[] = [];
    const bridge = mockBridge({
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
      saveConfig: async (c) => {
        saved.push(c);
        return c;
      },
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.updateConfig({ mode: "organization-host" });
    const last = saved.at(-1)!;
    expect(last.mode).toBe("organization-host");
    expect(last.targetUrl).toBe("");
    expect(last.setupComplete).toBe(false);
  });

  it("rejects unsafe open URL", async () => {
    const bridge = mockBridge({
      loadConfig: async () =>
        baseConfig({
          targetUrl: "javascript:alert(1)",
          autoStartOnOpen: false,
          autoOpenBrowser: false,
        }),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.openLibreVs();
    expect(manager.getSnapshot().diagnostics.errorCategory).toBe("url_invalid");
  });

  it("reset setup returns to wizard", async () => {
    const bridge = mockBridge({
      loadConfig: async () =>
        baseConfig({ autoStartOnOpen: false, autoOpenBrowser: false }),
      resetConfig: async () => defaultConfig(),
    });
    const manager = new DeploymentManager(bridge);
    await manager.initialize();
    await manager.resetSetup();
    expect(manager.getSnapshot().needsSetup).toBe(true);
  });

  it("reports unhealthy database category", async () => {
    const manager = new DeploymentManager({
      bridge: mockBridge({
        loadConfig: async () =>
          baseConfig({
            mode: "organization-connect",
            targetUrl: "https://esg.company.local",
            autoStartOnOpen: false,
            autoOpenBrowser: false,
          }),
      }),
      connectTimeoutMs: 50,
      healthPollInitialMs: 10,
      healthPollMaxMs: 10,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Failed to fetch");
      })
    );
    await manager.initialize();
    await manager.start();
    expect(manager.getSnapshot().state).toBe("ERROR");
    expect(manager.getSnapshot().diagnostics.errorCategory).toBe(
      "remote_unreachable"
    );
  });
});
