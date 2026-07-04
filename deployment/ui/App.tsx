import { useCallback, useEffect, useMemo, useState } from "react";
import { DeploymentManager } from "@deployment/deploymentManager";
import type {
  DeploymentManagerSnapshot,
  DeploymentMode,
} from "@deployment/types";
import { modeLabel } from "@deployment/environment";
import { detectPlatform } from "@deployment/platform";
import { WelcomeHero } from "./WelcomeHero";
import { StatusPanel } from "./StatusPanel";
import { ConfigPanel } from "./ConfigPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

const DOCKER_DESKTOP_URL = "https://www.docker.com/products/docker-desktop/";

export function App() {
  const manager = useMemo(
    () => new DeploymentManager(undefined, detectPlatform()),
    []
  );

  const [snapshot, setSnapshot] = useState<DeploymentManagerSnapshot>(() =>
    manager.getSnapshot()
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return manager.subscribe(setSnapshot);
  }, [manager]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    try {
      await manager.start();
    } finally {
      setBusy(false);
    }
  }, [manager]);

  const handleStop = useCallback(async () => {
    setBusy(true);
    try {
      await manager.stop();
    } finally {
      setBusy(false);
    }
  }, [manager]);

  const handleOpen = useCallback(async () => {
    await manager.openLibreVs();
  }, [manager]);

  const handleModeChange = useCallback(
    (mode: DeploymentMode) => {
      const updates = {
        mode,
        autoOpenBrowser: mode === "personal",
        targetUrl:
          mode === "personal"
            ? "http://localhost:3000"
            : snapshot.config.targetUrl,
      };
      manager.updateConfig(updates);
    },
    [manager, snapshot.config.targetUrl]
  );

  const handleConfigChange = useCallback(
    (partial: {
      targetUrl?: string;
      composeProjectDir?: string;
      autoOpenBrowser?: boolean;
    }) => {
      manager.updateConfig(partial);
    },
    [manager]
  );

  const isActive =
    snapshot.state !== "IDLE" &&
    snapshot.state !== "ERROR" &&
    snapshot.state !== "RUNNING";
  const showDockerHelp =
    snapshot.state === "ERROR" &&
    (snapshot.diagnostics.technicalDetails.docker as { errorCode?: string })
      ?.errorCode === "docker_missing";

  return (
    <div className="app">
      <WelcomeHero />

      <ConfigPanel
        config={snapshot.config}
        disabled={busy || isActive}
        onModeChange={handleModeChange}
        onConfigChange={handleConfigChange}
      />

      <StatusPanel
        snapshot={snapshot}
        busy={busy}
        onStart={handleStart}
        onStop={handleStop}
        onOpen={handleOpen}
      />

      {snapshot.state === "ERROR" && snapshot.diagnostics.error && (
        <div className="card">
          <p className="error-message">{snapshot.diagnostics.error}</p>
          {showDockerHelp && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
              <a
                className="help-link"
                href={DOCKER_DESKTOP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Docker Desktop
              </a>
            </p>
          )}
        </div>
      )}

      <DiagnosticsPanel diagnostics={snapshot.diagnostics} />

      <footer className="footer">
        {modeLabel(snapshot.config.mode)} · No telemetry · Self-hosted
      </footer>
    </div>
  );
}
