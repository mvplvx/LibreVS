use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum OpsError {
    #[error("{0}")]
    Message(String),
}

impl OpsError {
    pub fn msg(s: impl Into<String>) -> Self {
        Self::Message(s.into())
    }
}

pub type OpsResult<T> = Result<T, OpsError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub daemon_running: bool,
    pub compose_available: bool,
    pub docker_version: Option<String>,
    pub compose_version: Option<String>,
    pub error_code: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerInfo {
    pub name: String,
    pub service: String,
    pub state: String,
    pub status: String,
    pub uptime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectValidation {
    pub ok: bool,
    pub path: String,
    pub compose_file: String,
    pub error_code: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppImageStatus {
    pub app_image_present: bool,
    pub services_created: bool,
}

fn run_docker(args: &[&str], cwd: Option<&Path>) -> OpsResult<(i32, String, String)> {
    let mut cmd = Command::new("docker");
    cmd.args(args);
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let output = cmd
        .output()
        .map_err(|_| OpsError::msg("Container runtime is not installed on this system."))?;
    let code = output.status.code().unwrap_or(1);
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Ok((code, stdout, stderr))
}

pub fn check_docker() -> DockerStatus {
    let version = match run_docker(&["--version"], None) {
        Ok((0, out, _)) => out,
        _ => {
            return DockerStatus {
                installed: false,
                daemon_running: false,
                compose_available: false,
                docker_version: None,
                compose_version: None,
                error_code: Some("docker_missing".into()),
                error: Some(
                    "LibreVS requires a container runtime. Install Docker Desktop to continue."
                        .into(),
                ),
            };
        }
    };

    if run_docker(&["info"], None).map(|(c, _, _)| c == 0).unwrap_or(false) == false {
        return DockerStatus {
            installed: true,
            daemon_running: false,
            compose_available: false,
            docker_version: Some(version),
            compose_version: None,
            error_code: Some("daemon_stopped".into()),
            error: Some(
                "Docker is installed but is not running. Start Docker Desktop, then select Retry."
                    .into(),
            ),
        };
    }

    match run_docker(&["compose", "version"], None) {
        Ok((0, compose_version, _)) => DockerStatus {
            installed: true,
            daemon_running: true,
            compose_available: true,
            docker_version: Some(version),
            compose_version: Some(compose_version),
            error_code: None,
            error: None,
        },
        _ => DockerStatus {
            installed: true,
            daemon_running: true,
            compose_available: false,
            docker_version: Some(version),
            compose_version: None,
            error_code: Some("compose_missing".into()),
            error: Some("Docker Compose is required but was not found.".into()),
        },
    }
}

pub fn validate_project_dir(path: &str) -> ProjectValidation {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return ProjectValidation {
            ok: false,
            path: String::new(),
            compose_file: String::new(),
            error_code: Some("project_missing".into()),
            error: Some("Select the LibreVS installation folder.".into()),
        };
    }

    let dir = match PathBuf::from(trimmed).canonicalize() {
        Ok(p) => p,
        Err(_) => {
            return ProjectValidation {
                ok: false,
                path: trimmed.to_string(),
                compose_file: String::new(),
                error_code: Some("project_missing".into()),
                error: Some("The selected folder does not exist or is not accessible.".into()),
            };
        }
    };

    if !dir.is_dir() {
        return ProjectValidation {
            ok: false,
            path: dir.display().to_string(),
            compose_file: String::new(),
            error_code: Some("invalid_project".into()),
            error: Some("The selected path is not a folder.".into()),
        };
    }

    let compose = dir.join("docker-compose.yml");
    if !compose.is_file() {
        return ProjectValidation {
            ok: false,
            path: dir.display().to_string(),
            compose_file: String::new(),
            error_code: Some("compose_not_found".into()),
            error: Some(
                "Could not find docker-compose.yml in the selected folder. Choose the LibreVS project root."
                    .into(),
            ),
        };
    }

    let contents = match fs::read_to_string(&compose) {
        Ok(c) => c,
        Err(_) => {
            return ProjectValidation {
                ok: false,
                path: dir.display().to_string(),
                compose_file: compose.display().to_string(),
                error_code: Some("invalid_project".into()),
                error: Some("Could not read docker-compose.yml.".into()),
            };
        }
    };

    let looks_like_librevs = contents.contains("librevs")
        && (contents.contains("postgres") || contents.contains("POSTGRES"))
        && (contents.contains("container_name: librevs-app")
            || contents.contains("librevs-app")
            || (contents.contains("app:") && contents.contains("db:")));

    if !looks_like_librevs {
        return ProjectValidation {
            ok: false,
            path: dir.display().to_string(),
            compose_file: compose.display().to_string(),
            error_code: Some("invalid_project".into()),
            error: Some(
                "This folder does not look like a LibreVS deployment. Select the folder that contains the LibreVS docker-compose.yml."
                    .into(),
            ),
        };
    }

    ProjectValidation {
        ok: true,
        path: dir.display().to_string(),
        compose_file: compose.display().to_string(),
        error_code: None,
        error: None,
    }
}

fn require_valid_project(path: &str) -> OpsResult<PathBuf> {
    let v = validate_project_dir(path);
    if !v.ok {
        return Err(OpsError::msg(
            v.error
                .unwrap_or_else(|| "Invalid LibreVS installation folder.".into()),
        ));
    }
    Ok(PathBuf::from(v.path))
}

pub fn inspect_images(path: &str) -> OpsResult<AppImageStatus> {
    let dir = require_valid_project(path)?;
    let services_created = match run_docker(
        &["compose", "-f", "docker-compose.yml", "ps", "-a", "--format", "json"],
        Some(&dir),
    ) {
        Ok((0, out, _)) => !out.trim().is_empty(),
        _ => false,
    };

    // Prefer named image from compose build context; fall back to any librevs-app container image.
    let app_image_present = match run_docker(&["images", "--format", "{{.Repository}}:{{.Tag}}"], None)
    {
        Ok((0, out, _)) => {
            out.lines().any(|line| {
                let lower = line.to_lowercase();
                lower.contains("librevs") && (lower.contains("app") || lower.contains("librevs-app"))
            }) || image_from_compose_ps(&dir)
        }
        _ => image_from_compose_ps(&dir),
    };

    Ok(AppImageStatus {
        app_image_present,
        services_created,
    })
}

fn image_from_compose_ps(dir: &Path) -> bool {
    run_docker(
        &[
            "compose",
            "-f",
            "docker-compose.yml",
            "images",
            "-q",
        ],
        Some(dir),
    )
    .map(|(code, out, _)| code == 0 && !out.trim().is_empty())
    .unwrap_or(false)
}

pub fn compose_up(path: &str, build: bool) -> OpsResult<()> {
    let dir = require_valid_project(path)?;
    let args: Vec<&str> = if build {
        vec![
            "compose",
            "-f",
            "docker-compose.yml",
            "up",
            "--build",
            "-d",
        ]
    } else {
        vec!["compose", "-f", "docker-compose.yml", "up", "-d"]
    };
    let (code, stdout, stderr) = run_docker(&args, Some(&dir))?;
    if code != 0 {
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(OpsError::msg(format!(
            "Failed to start LibreVS containers. {}",
            truncate(&detail, 400)
        )));
    }
    Ok(())
}

pub fn compose_down(path: &str) -> OpsResult<()> {
    let dir = require_valid_project(path)?;
    // Intentionally omit -v to preserve volumes.
    let (code, stdout, stderr) = run_docker(
        &["compose", "-f", "docker-compose.yml", "down"],
        Some(&dir),
    )?;
    if code != 0 {
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(OpsError::msg(format!(
            "Failed to stop LibreVS. {}",
            truncate(&detail, 400)
        )));
    }
    Ok(())
}

pub fn compose_restart(path: &str) -> OpsResult<()> {
    let dir = require_valid_project(path)?;
    let (code, stdout, stderr) = run_docker(
        &["compose", "-f", "docker-compose.yml", "restart"],
        Some(&dir),
    )?;
    if code != 0 {
        // Fallback: down then up without build (preserves volumes).
        let _ = run_docker(&["compose", "-f", "docker-compose.yml", "down"], Some(&dir));
        let (code2, stdout2, stderr2) = run_docker(
            &["compose", "-f", "docker-compose.yml", "up", "-d"],
            Some(&dir),
        )?;
        if code2 != 0 {
            let detail = if !stderr2.is_empty() {
                stderr2
            } else if !stdout2.is_empty() {
                stdout2
            } else if !stderr.is_empty() {
                stderr
            } else {
                stdout
            };
            return Err(OpsError::msg(format!(
                "Failed to restart LibreVS. {}",
                truncate(&detail, 400)
            )));
        }
        return Ok(());
    }
    let _ = code;
    let _ = stdout;
    let _ = stderr;
    Ok(())
}

pub fn compose_ps(path: &str) -> OpsResult<Vec<ContainerInfo>> {
    let dir = require_valid_project(path)?;
    let (code, stdout, _) = run_docker(
        &["compose", "-f", "docker-compose.yml", "ps", "--format", "json"],
        Some(&dir),
    )?;
    if code != 0 {
        return Ok(vec![]);
    }
    let mut containers = Vec::new();
    for line in stdout.lines().filter(|l| !l.trim().is_empty()) {
        if let Ok(row) = serde_json::from_str::<serde_json::Value>(line) {
            let status = row
                .get("Status")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            containers.push(ContainerInfo {
                name: row
                    .get("Name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string(),
                service: row
                    .get("Service")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string(),
                state: row
                    .get("State")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string(),
                status: status.clone(),
                uptime: extract_uptime(&status),
            });
        }
    }
    Ok(containers)
}

pub fn containers_running(path: &str) -> OpsResult<bool> {
    let containers = compose_ps(path)?;
    if containers.is_empty() {
        return Ok(false);
    }
    Ok(containers.iter().all(|c| {
        c.state.eq_ignore_ascii_case("running") || c.status.to_lowercase().contains("up")
    }))
}

fn extract_uptime(status: &str) -> Option<String> {
    let lower = status.to_lowercase();
    if let Some(idx) = lower.find("up ") {
        let rest = &status[idx + 3..];
        let end = rest.find(" (").unwrap_or(rest.len());
        Some(rest[..end].trim().to_string())
    } else {
        None
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max).collect();
        format!("{truncated}…")
    }
}

#[cfg(target_os = "windows")]
pub fn try_start_docker_desktop() -> OpsResult<bool> {
    let candidates = [
        r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
        r"C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe",
    ];
    for path in candidates {
        if Path::new(path).is_file() {
            let status = Command::new(path)
                .spawn()
                .map(|_| true)
                .map_err(|e| OpsError::msg(format!("Could not start Docker Desktop: {e}")))?;
            return Ok(status);
        }
    }
    // Fallback: ShellExecute via cmd start without user input
    let result = Command::new("cmd")
        .args(["/C", "start", "", "Docker Desktop"])
        .spawn();
    match result {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(not(target_os = "windows"))]
pub fn try_start_docker_desktop() -> OpsResult<bool> {
    // Do not auto-start systemd docker with elevated privileges.
    Ok(false)
}

pub fn manager_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
