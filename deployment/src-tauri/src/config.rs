use crate::ops::{OpsError, OpsResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DeploymentMode {
    Personal,
    #[serde(rename = "organization-host")]
    OrganizationHost,
    #[serde(rename = "organization-connect")]
    OrganizationConnect,
}

impl Default for DeploymentMode {
    fn default() -> Self {
        Self::Personal
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentConfig {
    pub mode: DeploymentMode,
    pub target_url: String,
    pub compose_project_dir: String,
    pub auto_open_browser: bool,
    pub auto_start_on_open: bool,
    pub setup_complete: bool,
}

impl Default for DeploymentConfig {
    fn default() -> Self {
        Self {
            mode: DeploymentMode::Personal,
            target_url: "http://localhost:3000".into(),
            compose_project_dir: String::new(),
            auto_open_browser: true,
            auto_start_on_open: true,
            setup_complete: false,
        }
    }
}

fn config_path(app: &tauri::AppHandle) -> OpsResult<PathBuf> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| OpsError::msg(format!("Could not resolve config directory: {e}")))?;
    fs::create_dir_all(&dir).map_err(|e| OpsError::msg(format!("Could not create config directory: {e}")))?;
    Ok(dir.join("deployment.json"))
}

pub fn load_config(app: &tauri::AppHandle) -> DeploymentConfig {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(_) => return DeploymentConfig::default(),
    };
    match fs::read_to_string(&path) {
        Ok(raw) => match serde_json::from_str::<DeploymentConfig>(&raw) {
            Ok(cfg) => normalize(cfg),
            Err(_) => DeploymentConfig {
                setup_complete: false,
                ..DeploymentConfig::default()
            },
        },
        Err(_) => DeploymentConfig::default(),
    }
}

pub fn save_config(app: &tauri::AppHandle, config: DeploymentConfig) -> OpsResult<DeploymentConfig> {
    let path = config_path(app)?;
    let normalized = normalize(config);
    let tmp = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(&normalized)
        .map_err(|e| OpsError::msg(format!("Could not serialize configuration: {e}")))?;
    fs::write(&tmp, json).map_err(|e| OpsError::msg(format!("Could not write configuration: {e}")))?;
    fs::rename(&tmp, &path).map_err(|e| OpsError::msg(format!("Could not save configuration: {e}")))?;
    Ok(normalized)
}

pub fn reset_config(app: &tauri::AppHandle) -> OpsResult<DeploymentConfig> {
    let cfg = DeploymentConfig::default();
    save_config(app, cfg)
}

fn normalize(mut config: DeploymentConfig) -> DeploymentConfig {
    config.target_url = config.target_url.trim().trim_end_matches('/').to_string();
    if config.target_url.is_empty() {
        config.target_url = "http://localhost:3000".into();
    }
    config.compose_project_dir = config.compose_project_dir.trim().to_string();

    match config.mode {
        DeploymentMode::Personal => {
            config.target_url = "http://localhost:3000".into();
            if !config.setup_complete {
                config.auto_open_browser = true;
                config.auto_start_on_open = true;
            }
        }
        DeploymentMode::OrganizationHost => {
            // Do not force localhost; leave URL as configured.
        }
        DeploymentMode::OrganizationConnect => {
            config.compose_project_dir.clear();
            config.auto_start_on_open = false;
        }
    }
    config
}

pub fn validate_url(url: &str) -> OpsResult<()> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(OpsError::msg(
            "Application URL must start with http:// or https://.",
        ));
    }
    if trimmed.contains(char::is_whitespace) {
        return Err(OpsError::msg("Application URL must not contain spaces."));
    }
    Ok(())
}
