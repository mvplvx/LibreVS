import type {
  PreviewDisclosure,
  PreviewRepeatingRow,
  RegulatoryPreviewView,
} from "../../../lib/vsme/vs2026/previewPresentation";
import type { RegulatoryPreviewResult } from "../../../lib/vsme/vs2026/regulatoryPreview";

export function RegulatoryPreview({ result }: { result: RegulatoryPreviewResult }) {
  if (!result.ok) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">VS 2026 preview</h1>
        <p className="mt-3 text-sm text-slate-700">{result.message}</p>
        {result.issues.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {result.issues.map((issue) => (
              <li key={issue.code}>{issue.explanation}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  const { view } = result;
  return (
    <div className="space-y-6">
      <Notice view={view} />
      <Context result={result} view={view} />
      <Summary view={view} />
      {view.disclosures.map((disclosure) => (
        <DisclosureSection key={disclosure.id} disclosure={disclosure} />
      ))}
      <RepeatingSection rows={view.repeatingRows} />
      <Diagnostics diagnostics={view.diagnostics} />
    </div>
  );
}

function Notice({ view }: { view: RegulatoryPreviewView }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <h1 className="text-base font-semibold">{view.notice}</h1>
      <p className="mt-2">
        This preview does not certify regulatory compliance, does not replace the current reporting
        workspace, does not generate a VS 2026 report, and does not implement the Comprehensive Module.
      </p>
      <p className="mt-2">
        Completion assessment: {view.completionAssessment}. Compliance claim: {view.complianceClaim}.
      </p>
    </section>
  );
}

function Context({
  result,
  view,
}: {
  result: Extract<RegulatoryPreviewResult, { ok: true }>;
  view: RegulatoryPreviewView;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Reporting context</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Item term="Reporting period" value={result.year === null ? "Period year unavailable" : String(result.year)} />
        <Item term="Reporting option" value={view.reportingOptionLabel} />
        <Item term="Configuration status" value={configurationLabel(view.configurationStatus)} />
        <Item term="Employee-size category" value={view.employeeCategoryLabel} />
        <Item term="Evaluated disclosures" value={String(view.evaluatedDisclosureCount)} />
      </dl>
      {view.configurationDetail ? <p className="mt-3 text-sm text-slate-700">{view.configurationDetail}</p> : null}
      {view.employeeSizeDetail ? <p className="mt-2 text-sm text-slate-700">{view.employeeSizeDetail}</p> : null}
      {view.optionBNotice ? <p className="mt-3 text-sm font-medium text-slate-800">{view.optionBNotice}</p> : null}
      {view.additionalComprehensive.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {view.additionalComprehensive.map((item) => (
            <li key={item.disclosureId}>{item.label}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-sm text-slate-700">{view.reviewFlag.label}</p>
      <p className="mt-2 font-mono text-xs text-slate-500">Period id {result.reportingPeriodId}</p>
    </section>
  );
}

function Summary({ view }: { view: RegulatoryPreviewView }) {
  const rows = [
    ["Reported", view.summary.reported],
    ["Reported zero", view.summary.reportedZero],
    ["Reported false", view.summary.reportedFalse],
    ["Missing essential", view.summary.missingEssential],
    ["Voluntary", view.summary.voluntary],
    ["Not applicable", view.summary.notApplicable],
    ["Awaiting applicability assessment", view.summary.unassessed],
    ["Structurally omitted", view.summary.structurallyOmitted],
    ["Omissions requiring verification", view.summary.unverifiedOmissions],
    ["Unsupported disclosures", view.summary.unsupported],
    ["Invalid or ignored", view.summary.invalid],
  ] as const;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Regulatory status summary</h2>
      <p className="mt-2 text-sm text-slate-600">
        Counts come from the VS 2026 evaluator. They are not a compliance score.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([term, value]) => (
          <div key={term} className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-xs text-slate-500">{term}</dt>
            <dd className="text-lg font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DisclosureSection({ disclosure }: { disclosure: PreviewDisclosure }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{disclosure.heading}</h2>
      <p className="mt-2 text-sm text-slate-600">
        {disclosure.evaluatedFacts} evaluated facts. {disclosure.outstandingRequired} outstanding
        required. {disclosure.unassessedConditions} awaiting assessment. {disclosure.voluntary}{" "}
        voluntary. {disclosure.invalid} invalid. These counts are not a legal verdict for the
        disclosure.
      </p>
      {disclosure.id === "B3" ? (
        <p className="mt-2 text-sm text-slate-700">
          Electricity and fuel members are listed separately and are not added together.
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {disclosure.datapoints.map((item) => (
          <details
            key={`${item.datapointId}:${item.dimensionMember ?? ""}:${item.rowId ?? ""}`}
            className="rounded-md border border-slate-200 px-3 py-2"
          >
            <summary className="cursor-pointer text-sm font-medium text-slate-900">
              {item.label}
              <span className="ml-2 font-normal text-slate-500">{item.completionStatus}</span>
            </summary>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Item term="Reference" value={item.reference} />
              <Item term="Requirement" value={item.requirementType} />
              <Item term="Applicability" value={item.applicability} />
              <Item term="Employee-size treatment" value={item.employeeSizeTreatment} />
              <Item term="Value" value={item.valueStatus} />
              <Item term="Recorded value" value={recorded(item.recordedValue, item.recordedUnit)} />
              <Item term="Dimension" value={item.dimensionMember ?? "None"} />
              <Item term="Output inclusion" value={item.outputInclusion} />
            </dl>
            {item.explanations.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {item.explanations.map((explanation) => (
                  <li key={explanation}>{explanation}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 font-mono text-xs text-slate-500">
              {item.datapointId}
              {item.rowId ? ` · row ${item.rowId}` : ""}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function RepeatingSection({ rows }: { rows: readonly PreviewRepeatingRow[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Repeating and dimensioned rows</h2>
      <p className="mt-2 text-sm text-slate-600">
        Each stored row and dimension member is shown separately. Values are not summed.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">No repeating rows are stored for this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2">Row</th>
                <th className="px-2 py-2">Parent</th>
                <th className="px-2 py-2">Field</th>
                <th className="px-2 py-2">Dimension</th>
                <th className="px-2 py-2">Value</th>
                <th className="px-2 py-2">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) =>
                row.cells.length === 0
                  ? [
                      <tr key={row.rowId} className="border-t border-slate-200">
                        <td className="px-2 py-2">{row.groupLabel}</td>
                        <td className="px-2 py-2 font-mono text-xs">{row.rowId}</td>
                        <td className="px-2 py-2">{parentText(row)}</td>
                        <td className="px-2 py-2" colSpan={4}>
                          No cells stored
                        </td>
                      </tr>,
                    ]
                  : row.cells.map((cell) => (
                      <tr
                        key={`${row.rowId}:${cell.datapointId}:${cell.dimensionMember}`}
                        className="border-t border-slate-200"
                      >
                        <td className="px-2 py-2">{row.groupLabel}</td>
                        <td className="px-2 py-2 font-mono text-xs">{row.rowId}</td>
                        <td className="px-2 py-2">{parentText(row)}</td>
                        <td className="px-2 py-2">{cell.label}</td>
                        <td className="px-2 py-2">{cell.dimensionMember || "—"}</td>
                        <td className="px-2 py-2">{cell.value}</td>
                        <td className="px-2 py-2">{cell.unit ?? "—"}</td>
                      </tr>
                    )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Diagnostics({ diagnostics }: { diagnostics: readonly string[] }) {
  if (diagnostics.length === 0) {
    return null;
  }
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-950">Data quality</h2>
      <p className="mt-2 text-sm text-red-900">
        Some stored records were not evaluated. They are not treated as complete.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-900">
        {diagnostics.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{term}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}

function recorded(value: string | null, unit: string | null): string {
  if (value === null) {
    return "—";
  }
  return unit ? `${value} ${unit}` : value;
}

function parentText(row: PreviewRepeatingRow): string {
  if (!row.parentRowId) {
    return "—";
  }
  return row.parentLabel ? `${row.parentLabel} (${row.parentRowId})` : row.parentRowId;
}

function configurationLabel(status: RegulatoryPreviewView["configurationStatus"]): string {
  if (status === "NOT_CONFIGURED") {
    return "Not configured";
  }
  if (status === "REJECTED") {
    return "Invalid";
  }
  return "Configured";
}
