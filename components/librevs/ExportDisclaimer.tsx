type ExportDisclaimerProps = {
  compact?: boolean;
  className?: string;
};

/** Neutral compliance positioning — not legal advice. */
export function ExportDisclaimer({
  compact = false,
  className = "",
}: ExportDisclaimerProps) {
  if (compact) {
    return (
      <p className={`text-xs leading-relaxed text-slate-600 ${className}`}>
        LibreVS structures disclosures, validates completeness, and produces
        deterministic exports. It does not provide legal advice, guarantee
        regulatory acceptance, or replace auditors or consultants.
      </p>
    );
  }

  return (
    <aside
      className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 ${className}`}
      aria-label="Export disclaimer"
    >
      <p className="font-medium text-slate-900">Export responsibility</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        LibreVS structures VSME disclosures according to the configured registry,
        validates completeness against deterministic rules, and generates
        structured export artifacts (JSON, XLSX, PDF).
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        LibreVS does <span className="font-medium">not</span> provide legal advice,
        guarantee regulatory acceptance by authorities, or replace professional
        auditors, accountants, or sustainability consultants. Review all exports
        before submission.
      </p>
    </aside>
  );
}
