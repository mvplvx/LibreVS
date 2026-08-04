import type { DeploymentManagerSnapshot, DeploymentState } from "@deployment/types";
import { managesLocalDocker } from "@deployment/types";

type Props = {
  snapshot: DeploymentManagerSnapshot;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpen: () => void;
  onResetSetup: () => void;
};

function statusDotClass(state: DeploymentState): string {
  if (state === "RUNNING") return "running";
  if (state === "ERROR") return "error";
  if (state === "IDLE" || state === "SETUP") return "idle";
  return "pending";
}

export function StatusPanel({
  snapshot,
  busy,
  onStart,
  onStop,
  onRestart,
  onOpen,
  onResetSetup,
}: Props) {
  const { state, userMessage, diagnostics, config } = snapshot;
  const localDocker = managesLocalDocker(config);
  const canStop = localDocker && (state === "RUNNING" || state === "ERROR");
  const canRestart = localDocker && (state === "RUNNING" || state === "ERROR");
  const canStart =
    state === "IDLE" ||
    state === "ERROR" ||
    (config.mode === "organization-connect" && state !== "RUNNING");
  const canOpen = state === "RUNNING" || diagnostics.librevsRunning === true;

  const handleStop = () => {
    if (config.mode === "organization-host") {
      const ok = window.confirm(
        "Stop LibreVS on this server? Active users may lose access until it is started again. Data volumes are preserved."
      );
      if (!ok) return;
    }
    onStop();
  };

  return (
    <section className="card" aria-labelledby="status-heading">
      <h2 id="status-heading">Deployment status</h2>

      <div className="status-row">
        <span className={`status-dot ${statusDotClass(state)}`} aria-hidden />
        <p className="status-message">{userMessage}</p>
      </div>

      <dl className="diagnostics-grid" style={{ marginTop: "1rem" }}>
        {localDocker && (
          <div>
            <dt>Container runtime</dt>
            <dd>
              <StatusBadge value={diagnostics.dockerRunning} />
            </dd>
          </div>
        )}
        <div>
          <dt>Database</dt>
          <dd>
            <StatusBadge value={diagnostics.databaseRunning} />
          </dd>
        </div>
        <div>
          <dt>LibreVS</dt>
          <dd>
            <StatusBadge value={diagnostics.librevsRunning} />
          </dd>
        </div>
        <div>
          <dt>Application URL</dt>
          <dd className="url">{diagnostics.applicationUrl}</dd>
        </div>
      </dl>

      <div className="actions">
        {canStart && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={onStart}
          >
            {state === "ERROR" ? "Retry" : "Start LibreVS"}
          </button>
        )}
        {canOpen && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={onOpen}
          >
            Open LibreVS
          </button>
        )}
        {canRestart && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onRestart}
          >
            Restart LibreVS
          </button>
        )}
        {canStop && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={handleStop}
          >
            Stop LibreVS
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onResetSetup}
        >
          Change setup
        </button>
      </div>
    </section>
  );
}

function StatusBadge({ value }: { value: boolean | null }) {
  if (value === true) {
    return <span className="status-badge ok">Running</span>;
  }
  if (value === false) {
    return <span className="status-badge bad">Not running</span>;
  }
  return <span className="status-badge unknown">Unknown</span>;
}
