/**
 * @deprecated Use `npx tsx prisma/seed.ts` (npm run db:seed).
 */
console.warn("[LibreVS] prisma/seed.js is deprecated — use: npm run db:seed");
require("child_process").execSync("npx tsx prisma/seed.ts", {
  stdio: "inherit",
  cwd: require("path").join(__dirname, ".."),
});
