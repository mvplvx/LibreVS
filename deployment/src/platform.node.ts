import type { DeploymentPlatform } from "./platform.js";

export function createNodePlatform(): DeploymentPlatform {
  return {
    async checkDocker() {
      const { checkDocker } = await import("./docker.node.js");
      return checkDocker();
    },
    async composeUp(composeProjectDir) {
      const { composeUp } = await import("./docker.node.js");
      return composeUp(composeProjectDir);
    },
    async composeDown(composeProjectDir) {
      const { composeDown } = await import("./docker.node.js");
      return composeDown(composeProjectDir);
    },
    async composePs(composeProjectDir) {
      const { composePs } = await import("./docker.node.js");
      return composePs(composeProjectDir);
    },
    async areContainersRunning(composeProjectDir) {
      const { areContainersRunning } = await import("./docker.node.js");
      return areContainersRunning(composeProjectDir);
    },
  };
}

export type { DeploymentPlatform };
