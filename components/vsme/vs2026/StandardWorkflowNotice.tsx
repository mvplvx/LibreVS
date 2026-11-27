import Link from "next/link";

export function StandardWorkflowNotice({
  periodId,
  option,
  year,
}: {
  periodId: string;
  option: string;
  year: number | null;
}) {
  const recognised = option === "OPTION_A" || option === "OPTION_B";
  const heading =
    option === "OPTION_A"
      ? "This period uses VS 2026 Option A"
      : option === "OPTION_B"
        ? "This period uses VS 2026 Option B"
        : "This period has an unrecognised reporting standard";
  const detail =
    option === "OPTION_A"
      ? "Open the Basic Module editor for data entry, review, and finalisation."
      : option === "OPTION_B"
        ? "Option B is stored. The Comprehensive Module is not available yet."
        : "The stored option is not Option A or Option B. It is not treated as a completed report.";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      <p className="mt-2 text-sm text-slate-700">
        {year ?? "Year not set"}. {detail}
      </p>
      {recognised ? (
        <p className="mt-4 text-sm">
          <Link className="font-medium text-slate-900 underline" href={`/vsme/vs2026/edit/${periodId}`}>
            {option === "OPTION_A" ? "Open the VS 2026 editor" : "View the Option B status"}
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-700">
          Choose a period with a recognised standard, or open the editor only to see the invalid status. Saving
          Option A is a separate explicit action.
        </p>
      )}
      {!recognised ? (
        <p className="mt-3 text-sm">
          <Link className="font-medium text-slate-900 underline" href={`/vsme/vs2026/edit/${periodId}`}>
            Open the status page
          </Link>
        </p>
      ) : null}
    </section>
  );
}
