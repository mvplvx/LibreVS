export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  const { validateStartup } = await import("@/lib/startup/validateStartup");
  await validateStartup();
}
