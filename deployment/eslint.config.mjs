import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Deployment layer must not import LibreVS application code. */
const FORBIDDEN_IMPORT_PATTERNS = [
  {
    group: ["../app/**", "../lib/**", "../prisma/**", "@/"],
    message:
      "Deployment Manager must not import LibreVS application code (app/, lib/, prisma/).",
  },
];

export default tseslint.config(
  { ignores: ["dist/**", "src-tauri/target/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "ui/**/*.{ts,tsx}", "scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-restricted-imports": ["error", { patterns: FORBIDDEN_IMPORT_PATTERNS }],
    },
  }
);
