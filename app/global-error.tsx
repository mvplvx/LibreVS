"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-lg font-semibold">LibreVS could not load</h1>
            <p className="mt-2 text-sm text-slate-600">
              A critical application error occurred. Check server logs and database
              connectivity, then reload.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Reload application
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
