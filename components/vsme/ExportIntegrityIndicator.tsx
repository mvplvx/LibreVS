"use client";

type ExportIntegrityIndicatorProps = {
  exportCoverage: number;
  isValid: boolean;
  compact?: boolean;
};

function resolveTone(exportCoverage: number, isValid: boolean) {
  if (isValid) {
    return {
      label: "Export valid",
      className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (exportCoverage >= 50) {
    return {
      label: "Export incomplete",
      className: "bg-amber-50 text-amber-900 ring-amber-200",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "Export invalid",
    className: "bg-red-50 text-red-800 ring-red-200",
    dot: "bg-red-500",
  };
}

export function ExportIntegrityIndicator({
  exportCoverage,
  isValid,
  compact = false,
}: ExportIntegrityIndicatorProps) {
  const tone = resolveTone(exportCoverage, isValid);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.className}`}
        title={`${tone.label} · ${exportCoverage}% required coverage`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
        {exportCoverage}%
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
      <span>
        {tone.label} · {exportCoverage}% required
      </span>
    </div>
  );
}
