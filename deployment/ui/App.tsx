import { useCallback, useEffect, useMemo, useState } from "react";
import { DeploymentManager } from "@deployment/deploymentManager";
import type { DeploymentManagerSnapshot } from "@deployment/types";
import { detectBridge } from "@deployment/bridge";
import { modeLabel } from "@deployment/types";
import { WelcomeHero } from "./WelcomeHero";
import { StatusPanel } from "./StatusPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { SetupWizard } from "./SetupWizard";

const DOCKER_DESKTOP_URL = "https://www.docker.com/products/docker-desktop/";

export function App() {
  const manager = useMemo(
    () => new DeploymentManager(detectBridge()),
    []
  );

  const [snapshot, setSnapshot] = useState<DeploymentManagerSnapshot | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = manager.subscribe(setSnapshot);
    void manager.initialize().finally(() => setReady(true));
    return unsub;
  }, [manager]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    },
    []
  );

  if (!ready || !snapshot) {
    return (
      <div className="app">
        <WelcomeHero />
        <section className="card">
          <p className="status-message">Loading Deployment Manager…</p>
        </section>
      </div>
    );
  }

  if (snapshot.needsSetup) {
    return (
      <div className="app">
        <WelcomeHero />
        <SetupWizard
          initial={snapshot.config}
          onComplete={(config) => manager.completeSetup(config)}
          onPickDirectory={() => manager.pickProjectDirectory()}
          onValidateDirectory={(path) => manager.validateProjectDirectory(path)}
        />
        <footer className="footer">
          Official LibreVS operational interface · No telemetry · Self-hosted
        </footer>
      </div>
    );
  }

  const showDockerHelp =
    snapshot.diagnostics.errorCategory === "docker_missing" ||
    snapshot.diagnostics.errorCategory === "daemon_stopped";

  return (
    <div className="app">
      <WelcomeHero />

      <StatusPanel
        snapshot={snapshot}
        busy={busy}
        onStart={() => run(() => manager.start())}
        onStop={() => run(() => manager.stop())}
        onRestart={() => run(() => manager.restart())}
        onOpen={() => run(() => manager.openLibreVs())}
        onResetSetup={() => run(() => manager.resetSetup())}
      />

      {snapshot.state === "ERROR" && snapshot.diagnostics.error && (
        <div className="card">
          <p className="error-message">{snapshot.diagnostics.error}</p>
          {snapshot.diagnostics.nextStep && (
            <p className="help">{snapshot.diagnostics.nextStep}</p>
          )}
          {showDockerHelp && (
            <p className="help">
              <a
                className="help-link"
                href={DOCKER_DESKTOP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Docker Desktop installation help
              </a>
            </p>
          )}
        </div>
      )}

      <DiagnosticsPanel diagnostics={snapshot.diagnostics} />

      <footer className="footer">
        {modeLabel(snapshot.config.mode)} · LibreVS Deployment Manager · No
        telemetry
      </footer>
    </div>
  );
}
