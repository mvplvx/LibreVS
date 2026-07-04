import type { DeploymentDiagnostics, MigrationStatus } from "@deployment/types";

type Props = {
  diagnostics: DeploymentDiagnostics;
};

export function DiagnosticsPanel({ diagnostics }: Props) {
  return (
    <section className="card diagnostics" aria-labelledby="diag-heading">
      <details>
        <summary id="diag-heading">View diagnostics</summary>

        <dl className="diagnostics-grid">
          <div>
            <dt>LibreVS version</dt>
            <dd>{diagnostics.librevsVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Schema version</dt>
            <dd>{diagnostics.schemaVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Migration status</dt>
            <dd>
              <MigrationBadge status={diagnostics.migrationStatus} />
            </dd>
          </div>
          <div>
            <dt>Container uptime</dt>
            <dd>{diagnostics.containerUptime ?? "—"}</dd>
          </div>
          <div>
            <dt>Last health check</dt>
            <dd>{formatTime(diagnostics.lastHealthCheck)}</dd>
          </div>
          <div>
            <dt>Deployment state</dt>
            <dd>{diagnostics.deploymentState}</dd>
          </div>
        </dl>

        {diagnostics.containers.length > 0 && (
          <>
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#475569",
              }}
            >
              Containers
            </p>
            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
              {diagnostics.containers.map((c) => (
                <li key={c.name} style={{ fontSize: "0.8125rem" }}>
                  {c.service}: {c.state} {c.uptime ? `(${c.uptime})` : ""}
                </li>
              ))}
            </ul>
          </>
        )}

        <pre className="diagnostics-json" aria-label="Technical details">
          {JSON.stringify(diagnostics.technicalDetails, null, 2)}
        </pre>
      </details>
    </section>
  );
}

function MigrationBadge({ status }: { status: MigrationStatus }) {
  switch (status) {
    case "ok":
      return <span className="status-badge ok">Up to date</span>;
    case "degraded":
      return <span className="status-badge warn">Needs attention</span>;
    case "error":
      return <span className="status-badge bad">Error</span>;
    default:
      return <span className="status-badge unknown">Unknown</span>;
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
