import { useState } from "react";
import type { DeploymentConfig, DeploymentMode } from "@deployment/types";
import { defaultConfig, managesLocalDocker, modeLabel } from "@deployment/types";

type Props = {
  initial: DeploymentConfig;
  onComplete: (config: DeploymentConfig) => Promise<void>;
  onPickDirectory: () => Promise<string | null>;
  onValidateDirectory: (
    path: string
  ) => Promise<{ ok: boolean; path: string; error?: string | null }>;
};

export function SetupWizard({
  initial,
  onComplete,
  onPickDirectory,
  onValidateDirectory,
}: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<DeploymentConfig>({
    ...defaultConfig(),
    ...initial,
    setupComplete: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setMode = (mode: DeploymentMode) => {
    setConfig((prev) => {
      if (mode === "personal") {
        return {
          ...prev,
          mode,
          targetUrl: "http://localhost:3000",
          autoOpenBrowser: true,
          autoStartOnOpen: true,
        };
      }
      if (mode === "organization-host") {
        return {
          ...prev,
          mode,
          targetUrl:
            /localhost|127\.0\.0\.1/i.test(prev.targetUrl) ? "" : prev.targetUrl,
          autoOpenBrowser: false,
          autoStartOnOpen: true,
        };
      }
      return {
        ...prev,
        mode,
        composeProjectDir: "",
        autoStartOnOpen: false,
        autoOpenBrowser: true,
      };
    });
  };

  const next = async () => {
    setError(null);
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1 && managesLocalDocker(config)) {
      if (!config.composeProjectDir.trim()) {
        setError("Select the LibreVS installation folder.");
        return;
      }
      const validation = await onValidateDirectory(config.composeProjectDir);
      if (!validation.ok) {
        setError(validation.error ?? "Invalid LibreVS folder.");
        return;
      }
      setConfig((c) => ({ ...c, composeProjectDir: validation.path }));
      setStep(2);
      return;
    }
    if (step === 1 && config.mode === "organization-connect") {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!config.targetUrl.trim()) {
        setError("Enter the application URL.");
        return;
      }
      if (
        config.mode === "organization-host" &&
        /localhost|127\.0\.0\.1/i.test(config.targetUrl)
      ) {
        setError(
          "Organization-host mode requires a non-localhost URL such as http://server-name:3000."
        );
        return;
      }
      setStep(3);
      return;
    }
    setBusy(true);
    try {
      await onComplete({ ...config, setupComplete: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  };

  const pickDir = async () => {
    const path = await onPickDirectory();
    if (path) {
      setConfig((c) => ({ ...c, composeProjectDir: path }));
      setError(null);
    }
  };

  return (
    <section className="card" aria-labelledby="setup-heading">
      <h2 id="setup-heading">First-launch setup</h2>
      <p className="muted">
        Deployment Manager is the official way to start and manage LibreVS after
        installation.
      </p>

      {step === 0 && (
        <div className="field">
          <label htmlFor="setup-mode">Deployment mode</label>
          <select
            id="setup-mode"
            value={config.mode}
            onChange={(e) => setMode(e.target.value as DeploymentMode)}
          >
            <option value="personal">{modeLabel("personal")}</option>
            <option value="organization-host">
              {modeLabel("organization-host")}
            </option>
            <option value="organization-connect">
              {modeLabel("organization-connect")}
            </option>
          </select>
          <p className="help">
            Personal and host modes manage Docker locally. Connect mode only
            opens a remote LibreVS URL.
          </p>
        </div>
      )}

      {step === 1 && managesLocalDocker(config) && (
        <div className="field">
          <label htmlFor="setup-dir">LibreVS installation folder</label>
          <div className="row">
            <input
              id="setup-dir"
              type="text"
              value={config.composeProjectDir}
              readOnly
              placeholder="Select the folder that contains docker-compose.yml"
            />
            <button type="button" className="btn btn-secondary" onClick={pickDir}>
              Browse…
            </button>
          </div>
        </div>
      )}

      {step === 1 && config.mode === "organization-connect" && (
        <p className="help">
          Connect mode does not use a local installation folder or Docker.
        </p>
      )}

      {step === 2 && (
        <div className="field">
          <label htmlFor="setup-url">Application URL</label>
          <input
            id="setup-url"
            type="url"
            value={config.targetUrl}
            disabled={config.mode === "personal"}
            placeholder="http://server-name:3000"
            onChange={(e) =>
              setConfig((c) => ({ ...c, targetUrl: e.target.value }))
            }
          />
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          {config.mode !== "organization-connect" && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={config.autoStartOnOpen}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    autoStartOnOpen: e.target.checked,
                  }))
                }
              />
              Start LibreVS automatically when Deployment Manager opens
            </label>
          )}
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={config.autoOpenBrowser}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  autoOpenBrowser: e.target.checked,
                }))
              }
            />
            Open LibreVS in the browser when ready
          </label>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      <div className="actions">
        {step > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void next()}
        >
          {step === 3 ? (busy ? "Saving…" : "Save and start") : "Continue"}
        </button>
      </div>
    </section>
  );
}
