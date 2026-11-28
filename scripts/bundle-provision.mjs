import { mkdirSync } from "node:fs";

import * as esbuild from "esbuild";

mkdirSync("docker", { recursive: true });

await esbuild.build({
  entryPoints: ["scripts/provision-auth-user.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "docker/provision-auth-user.cjs",
  alias: {
    "@": ".",
  },
  packages: "external",
  logLevel: "info",
});
