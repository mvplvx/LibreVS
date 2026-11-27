import type { ReviewIssue, ReviewSeverity, VS2026ReportingState } from "@/lib/vsme/vs2026/reportingState";

const readinessLabel: Record<string, string> = {
  NOT_CONFIGURED: "Not configured for VS 2026",
  IN_PROGRESS: "In progress",
  NEEDS_ASSESSMENT: "Needs an explicit assessment",
  NEEDS_CORRECTION: "Needs correction",
  READY_FOR_REVIEW: "Ready for internal review",
  UNSUPPORTED: "Unsupported",
  INVALID_REPORTING_STATE: "Invalid reporting state",
};

const groups: { severity: ReviewSeverity; heading: string }[] = [
  { severity: "blocking", heading: "Required before internal review" },
  { severity: "quality", heading: "Internal quality checks" },
  { severity: "unsupported", heading: "Unsupported for this workflow" },
  { severity: "finalisation", heading: "Report finalisation" },
  { severity: "warning", heading: "Warnings" },
  { severity: "optional", heading: "Optional improvements" },
];

export function ReviewPanel({
  state,
}: {
  state: Extract<VS2026ReportingState, { ok: true }>;
}) {
  const { review } = state;
  const option =
    state.reportingOption === "OPTION_A"
      ? "Option A — Basic Module"
      : state.reportingOption === "OPTION_B"
        ? "Option B — not evaluated"
        : "Not configured";
  return (
    <section id="vs2026-review" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Basic Module review</h2>
      <p className="mt-2 text-sm text-slate-700">
        This is an internal review of saved information. It is not a legal certification and it does
        not prepare the conformity statement.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Reporting period</dt>
          <dd className="font-medium text-slate-900">
            {state.companyName ? `${state.companyName}, ` : ""}
            {state.year ?? "Year not set"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Reporting option</dt>
          <dd className="font-medium text-slate-900">{option}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Employee-size category</dt>
          <dd className="font-medium text-slate-900">{review.employeeCategoryLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Internal review status</dt>
          <dd className="font-medium text-slate-900">
            {readinessLabel[review.readiness] ?? review.readiness}
          </dd>
        </div>
      </dl>
      <h3 className="mt-6 text-sm font-semibold text-slate-900">Disclosures B1 to B11</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {review.disclosures.map((disclosure) => (
          <li key={disclosure.id}>
            <a className="font-medium text-slate-900 underline" href={`#vs2026-${disclosure.id}`}>
              {disclosure.id} — {disclosure.title}
            </a>
            <span className="text-slate-600">
              {disclosure.requiredMissing > 0 ? ` · ${disclosure.requiredMissing} required missing` : ""}
              {disclosure.unassessed > 0 ? ` · ${disclosure.unassessed} unassessed` : ""}
              {disclosure.invalid > 0 ? ` · ${disclosure.invalid} to correct` : ""}
              {disclosure.requiredMissing === 0 && disclosure.unassessed === 0 && disclosure.invalid === 0
                ? " · no outstanding required item in this summary"
                : ""}
            </span>
          </li>
        ))}
      </ul>
      {groups.map((group) => {
        const items = review.issues.filter((item) => item.severity === group.severity);
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={group.severity} className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">{group.heading}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {items.map((item) => (
                <IssueLink key={`${item.code}-${item.datapointId ?? item.disclosureId}-${item.message}`} item={item} />
              ))}
            </ul>
          </div>
        );
      })}
      {review.structuralOmissions > 0 ? (
        <p className="mt-6 text-sm text-slate-700">
          {review.structuralOmissions} paragraph 22 {review.structuralOmissions === 1 ? "claim is" : "claims are"}{" "}
          structurally complete. That is the undertaking&apos;s attestation, not an independent legal approval.
        </p>
      ) : null}
      <h3 className="mt-6 text-sm font-semibold text-slate-900">Limitations</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {review.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}

function IssueLink({ item }: { item: ReviewIssue }) {
  return (
    <li>
      <a className="text-slate-900 underline" href={item.href}>
        {item.disclosureTitle}
      </a>
      <span>{` — ${item.message}`}</span>
    </li>
  );
}
