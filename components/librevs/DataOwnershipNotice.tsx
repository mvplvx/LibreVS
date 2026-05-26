import Link from "next/link";

type DataOwnershipNoticeProps = {
  compact?: boolean;
};

/** Local-first data ownership guidance (no cloud lock-in messaging). */
export function DataOwnershipNotice({ compact = false }: DataOwnershipNoticeProps) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-slate-600">
        LibreVS stores reporting data locally in your configured PostgreSQL database.
        You are responsible for backups and retention.{" "}
        <Link href="/system/backup" className="font-medium text-slate-700 underline">
          Data safety
        </Link>
      </p>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-900">Local data ownership</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        LibreVS stores all reporting periods, field values, materiality decisions,
        and export snapshots in <strong>your</strong> PostgreSQL database. No
        reporting data is sent to LibreVS-operated cloud services.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Back up your database regularly before upgrades. Export artifacts (XLSX,
        PDF, JSON) provide an additional offline copy of validated disclosure rows.
      </p>
      <Link
        href="/system/backup"
        className="mt-3 inline-block text-sm font-medium text-slate-800 underline"
      >
        Read data safety guidance →
      </Link>
    </section>
  );
}
