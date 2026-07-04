import type { DeploymentConfig, DeploymentMode } from "@deployment/types";
import { modeLabel } from "@deployment/environment";
import { managesLocalDocker } from "@deployment/environment";

type Props = {
  config: DeploymentConfig;
  disabled: boolean;
  onModeChange: (mode: DeploymentMode) => void;
  onConfigChange: (partial: {
    targetUrl?: string;
    composeProjectDir?: string;
    autoOpenBrowser?: boolean;
  }) => void;
};

export function ConfigPanel({
  config,
  disabled,
  onModeChange,
  onConfigChange,
}: Props) {
  const showComposeDir = managesLocalDocker(config);

  return (
    <section className="card" aria-labelledby="config-heading">
      <h2 id="config-heading">Deployment configuration</h2>

      <div className="field">
        <label htmlFor="deployment-mode">Deployment mode</label>
        <select
          id="deployment-mode"
          value={config.mode}
          disabled={disabled}
          onChange={(e) => onModeChange(e.target.value as DeploymentMode)}
        >
          <option value="personal">{modeLabel("personal")}</option>
          <option value="organization-host">
            {modeLabel("organization-host")}
          </option>
          <option value="organization-connect">
            {modeLabel("organization-connect")}
          </option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="target-url">Application URL</label>
        <input
          id="target-url"
          type="url"
          value={config.targetUrl}
          disabled={disabled || config.mode === "personal"}
          placeholder="http://localhost:3000"
          onChange={(e) => onConfigChange({ targetUrl: e.target.value })}
        />
      </div>

      {showComposeDir && (
        <div className="field">
          <label htmlFor="compose-dir">LibreVS project directory</label>
          <input
            id="compose-dir"
            type="text"
            value={config.composeProjectDir}
            disabled={disabled}
            placeholder="/path/to/librevs (folder with docker-compose.yml)"
            onChange={(e) =>
              onConfigChange({ composeProjectDir: e.target.value })
            }
          />

        </div>
      )}

      {config.mode === "personal" && (
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={config.autoOpenBrowser}
            disabled={disabled}
            onChange={(e) =>
              onConfigChange({ autoOpenBrowser: e.target.checked })
            }
          />
          Open browser automatically when LibreVS is ready
        </label>
      )}
    </section>
  );
}
