mod config;
mod ops;

use config::{DeploymentConfig, DeploymentMode};
use ops::{
    check_docker, compose_down, compose_ps, compose_restart, compose_up, containers_running,
    inspect_images, manager_version, try_start_docker_desktop, validate_project_dir, AppImageStatus,
    ContainerInfo, DockerStatus, ProjectValidation,
};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

fn map_err(e: ops::OpsError) -> String {
    e.to_string()
}

#[tauri::command]
fn get_manager_version() -> String {
    manager_version()
}

#[tauri::command]
fn load_deployment_config(app: AppHandle) -> DeploymentConfig {
    config::load_config(&app)
}

#[tauri::command]
fn save_deployment_config(app: AppHandle, config: DeploymentConfig) -> Result<DeploymentConfig, String> {
    config::validate_url(&config.target_url).map_err(map_err)?;
    if matches!(
        config.mode,
        DeploymentMode::Personal | DeploymentMode::OrganizationHost
    ) && config.setup_complete
    {
        let validation = validate_project_dir(&config.compose_project_dir);
        if !validation.ok {
            return Err(validation
                .error
                .unwrap_or_else(|| "Invalid LibreVS installation folder.".into()));
        }
    }
    if matches!(config.mode, DeploymentMode::OrganizationHost)
        && config.setup_complete
        && (config.target_url == "http://localhost:3000"
            || config.target_url == "https://localhost:3000")
    {
        return Err(
            "Organization-host mode requires a non-localhost application URL used by your organization."
                .into(),
        );
    }
    config::save_config(&app, config).map_err(map_err)
}

#[tauri::command]
fn reset_deployment_config(app: AppHandle) -> Result<DeploymentConfig, String> {
    config::reset_config(&app).map_err(map_err)
}

#[tauri::command]
fn check_docker_status() -> DockerStatus {
    check_docker()
}

#[tauri::command]
fn validate_librevs_project(path: String) -> ProjectValidation {
    validate_project_dir(&path)
}

#[tauri::command]
fn pick_librevs_directory(app: AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.and_then(|f| f.into_path().ok()).map(|p| p.display().to_string()))
}

#[tauri::command]
fn docker_compose_up(path: String, build: bool) -> Result<(), String> {
    compose_up(&path, build).map_err(map_err)
}

#[tauri::command]
fn docker_compose_down(path: String) -> Result<(), String> {
    compose_down(&path).map_err(map_err)
}

#[tauri::command]
fn docker_compose_restart(path: String) -> Result<(), String> {
    compose_restart(&path).map_err(map_err)
}

#[tauri::command]
fn docker_compose_ps(path: String) -> Result<Vec<ContainerInfo>, String> {
    compose_ps(&path).map_err(map_err)
}

#[tauri::command]
fn docker_containers_running(path: String) -> Result<bool, String> {
    containers_running(&path).map_err(map_err)
}

#[tauri::command]
fn docker_inspect_images(path: String) -> Result<AppImageStatus, String> {
    inspect_images(&path).map_err(map_err)
}

#[tauri::command]
fn start_docker_desktop() -> Result<bool, String> {
    try_start_docker_desktop().map_err(map_err)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    config::validate_url(&url).map_err(map_err)?;
    open::that(&url).map_err(|e| format!("Could not open browser: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_manager_version,
            load_deployment_config,
            save_deployment_config,
            reset_deployment_config,
            check_docker_status,
            validate_librevs_project,
            pick_librevs_directory,
            docker_compose_up,
            docker_compose_down,
            docker_compose_restart,
            docker_compose_ps,
            docker_containers_running,
            docker_inspect_images,
            start_docker_desktop,
            open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LibreVS Deployment Manager");
}
