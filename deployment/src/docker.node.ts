import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ContainerInfo, DockerCheckResult } from "./types.js";

const execFileAsync = promisify(execFile);

async function runCommand(
  command: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await runCommand(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function checkDocker(): Promise<DockerCheckResult> {
  const installed = await commandExists("docker");
  if (!installed) {
    return {
      installed: false,
      daemonRunning: false,
      composeAvailable: false,
      error: "Container runtime is not installed on this system.",
      errorCode: "docker_missing",
    };
  }

  let dockerVersion: string | undefined;
  try {
    const { stdout } = await runCommand("docker", ["--version"]);
    dockerVersion = stdout.trim();
  } catch {
    /* ignore */
  }

  let daemonRunning = false;
  try {
    await runCommand("docker", ["info"]);
    daemonRunning = true;
  } catch {
    return {
      installed: true,
      daemonRunning,
      composeAvailable: false,
      dockerVersion,
      error: "Container runtime is installed but not running. Please start it and try again.",
      errorCode: "daemon_stopped",
    };
  }

  let composeAvailable = false;
  let composeVersion: string | undefined;
  try {
    const { stdout } = await runCommand("docker", ["compose", "version"]);
    composeAvailable = true;
    composeVersion = stdout.trim();
  } catch {
    return {
      installed: true,
      daemonRunning,
      composeAvailable,
      dockerVersion,
      error: "Docker Compose plugin is not available.",
      errorCode: "compose_missing",
    };
  }

  return {
    installed: true,
    daemonRunning,
    composeAvailable,
    dockerVersion,
    composeVersion,
  };
}

export async function composeUp(
  composeProjectDir: string,
  composeFile = "docker-compose.yml"
): Promise<void> {
  await runCommand(
    "docker",
    ["compose", "-f", composeFile, "up", "-d"],
    composeProjectDir
  );
}

export async function composeDown(
  composeProjectDir: string,
  composeFile = "docker-compose.yml"
): Promise<void> {
  await runCommand(
    "docker",
    ["compose", "-f", composeFile, "down"],
    composeProjectDir
  );
}

export async function composePs(
  composeProjectDir: string,
  composeFile = "docker-compose.yml"
): Promise<ContainerInfo[]> {
  try {
    const { stdout } = await runCommand(
      "docker",
      ["compose", "-f", composeFile, "ps", "--format", "json"],
      composeProjectDir
    );
    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const containers: ContainerInfo[] = [];
    for (const line of lines) {
      try {
        const row = JSON.parse(line) as {
          Name?: string;
          Service?: string;
          State?: string;
          Status?: string;
        };
        containers.push({
          name: row.Name ?? "unknown",
          service: row.Service ?? "unknown",
          state: row.State ?? "unknown",
          status: row.Status ?? "",
          uptime: extractUptime(row.Status ?? ""),
        });
      } catch {
        /* skip malformed line */
      }
    }
    return containers;
  } catch {
    return [];
  }
}

function extractUptime(status: string): string | undefined {
  const match = status.match(/Up\s+(.+?)(?:\s+\(|$)/i);
  return match?.[1]?.trim();
}

export async function areContainersRunning(
  composeProjectDir: string,
  composeFile = "docker-compose.yml"
): Promise<boolean> {
  const containers = await composePs(composeProjectDir, composeFile);
  if (containers.length === 0) return false;
  return containers.every(
    (c) => c.state.toLowerCase() === "running" || c.status.toLowerCase().includes("up")
  );
}

export { runCommand };
