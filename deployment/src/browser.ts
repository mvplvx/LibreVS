/** Tauri-aware browser open for Deployment Manager UI. */
export async function openBrowserUniversal(url: string): Promise<void> {
  if (isTauriRuntime()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  const opener = (globalThis as typeof globalThis & { open?: (url: string) => void })
    .open;
  if (typeof opener === "function") {
    opener(url);
    return;
  }

  throw new Error("Cannot open browser in this environment.");
}

function isTauriRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "window" in globalThis &&
    "__TAURI_INTERNALS__" in (globalThis as { window?: object }).window!
  );
}
