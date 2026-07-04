import type { ContainerInfo, DockerCheckResult } from "./types.js";

/** Platform abstraction so orchestration works in Tauri UI and browser dev. */
export type DeploymentPlatform = {
  checkDocker: () => Promise<DockerCheckResult>;
  composeUp: (composeProjectDir: string) => Promise<void>;
  composeDown: (composeProjectDir: string) => Promise<void>;
  composePs: (composeProjectDir: string) => Promise<ContainerInfo[]>;
  areContainersRunning: (composeProjectDir: string) => Promise<boolean>;
};

async function tauriShellCommand(
  program: string,
  args: string[],
  cwd?: string
): Promise<string> {
  const { Command } = await import("@tauri-apps/plugin-shell");
  const cmd = Command.create(program, args, { cwd });
  const output = await cmd.execute();
  if (output.code !== 0) {
    throw new Error(output.stderr || output.stdout || `Command failed: ${program}`);
  }
  return output.stdout;
}

function isTauriRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "window" in globalThis &&
    "__TAURI_INTERNALS__" in (globalThis as { window?: object }).window!
  );
}

export function createTauriPlatform(): DeploymentPlatform {
  return {
    async checkDocker() {
      try {
        const dockerVersion = (
          await tauriShellCommand("docker", ["--version"])
        ).trim();
        try {
          await tauriShellCommand("docker", ["info"]);
        } catch {
          return {
            installed: true,
            daemonRunning: false,
            composeAvailable: false,
            dockerVersion,
            error:
              "Container runtime is installed but not running. Please start it and try again.",
            errorCode: "daemon_stopped",
          };
        }
        try {
          const composeVersion = (
            await tauriShellCommand("docker", ["compose", "version"])
          ).trim();
          return {
            installed: true,
            daemonRunning: true,
            composeAvailable: true,
            dockerVersion,
            composeVersion,
          };
        } catch {
          return {
            installed: true,
            daemonRunning: true,
            composeAvailable: false,
            dockerVersion,
            error: "Docker Compose plugin is not available.",
            errorCode: "compose_missing",
          };
        }
      } catch {
        return {
          installed: false,
          daemonRunning: false,
          composeAvailable: false,
          error: "Container runtime is not installed on this system.",
          errorCode: "docker_missing",
        };
      }
    },
    async composeUp(composeProjectDir) {
      await tauriShellCommand(
        "docker",
        ["compose", "-f", "docker-compose.yml", "up", "-d"],
        composeProjectDir
      );
    },
    async composeDown(composeProjectDir) {
      await tauriShellCommand(
        "docker",
        ["compose", "-f", "docker-compose.yml", "down"],
        composeProjectDir
      );
    },
    async composePs(composeProjectDir) {
      try {
        const stdout = await tauriShellCommand(
          "docker",
          ["compose", "-f", "docker-compose.yml", "ps", "--format", "json"],
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
            });
          } catch {
            /* skip */
          }
        }
        return containers;
      } catch {
        return [];
      }
    },
    async areContainersRunning(composeProjectDir) {
      const containers = await this.composePs(composeProjectDir);
      if (containers.length === 0) return false;
      return containers.every(
        (c) =>
          c.state.toLowerCase() === "running" ||
          c.status.toLowerCase().includes("up")
      );
    },
  };
}

export function createBrowserStubPlatform(): DeploymentPlatform {
  const unavailable = async (): Promise<never> => {
    throw new Error(
      "Container management requires the LibreVS Deployment Manager desktop app."
    );
  };
  return {
    async checkDocker() {
      return {
        installed: false,
        daemonRunning: false,
        composeAvailable: false,
        error:
          "Container management is available in the desktop Deployment Manager.",
        errorCode: "docker_missing",
      };
    },
    composeUp: unavailable,
    composeDown: unavailable,
    composePs: async () => [],
    areContainersRunning: async () => false,
  };
}

export function detectPlatform(): DeploymentPlatform {
  if (isTauriRuntime()) {
    return createTauriPlatform();
  }
  return createBrowserStubPlatform();
}
