"use client";

import { useState, useTransition } from "react";

import { finaliseReportAction } from "@/lib/vsme/vs2026/editorActions";
import type { VS2026ReportPanel } from "@/lib/vsme/vs2026/reportDataset";
import type { VS2026ReportingState } from "@/lib/vsme/vs2026/reportingState";

const buttonClass = "rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";

export function FinalisationPanel({
  reportingPeriodId,
  state,
  panel,
  refresh,
}: {
  reportingPeriodId: string;
  state: Extract<VS2026ReportingState, { ok: true }>;
  panel: VS2026ReportPanel;
  refresh: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = state.review.readiness === "READY_FOR_REVIEW";
  const blocking = state.review.issues.filter(
    (item) => item.severity === "blocking" || item.severity === "quality" || item.severity === "unsupported",
  );

  function finalise() {
    setMessage(null);
    startTransition(async () => {
      const result = await finaliseReportAction(reportingPeriodId, accepted === true);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setAccepted(false);
      setMessage(`Report revision ${result.revision} is final.`);
      refresh();
    });
  }

  return (
    <section id="vs2026-finalisation" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Finalise the Option A report</h2>
      <p className="mt-3 text-sm text-slate-700">
        Review readiness is a technical check. Finalising records the undertaking&apos;s declaration for this
        report version. An authenticated member of this organisation can do that for the undertaking. A separate
        approver role is a future enhancement.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Reporting option</dt>
          <dd>Option A — Basic Module</dd>
        </div>
        <div>
          <dt className="text-slate-500">Reporting currency</dt>
          <dd>{panel.currency}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Review status</dt>
          <dd>{state.review.readiness}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Paragraph 22 omissions</dt>
          <dd>{state.review.structuralOmissions}</dd>
        </div>
      </dl>
      {blocking.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-900">Outstanding issues</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {blocking.slice(0, 8).map((item) => (
              <li key={`${item.code}-${item.datapointId ?? item.disclosureId}`}>
                <a className="underline" href={item.href}>
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-700">The technical review has no blocking issue.</p>
      )}
      <h3 className="mt-4 text-sm font-semibold text-slate-900">Proposed conformity statement</h3>
      <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm text-slate-800">
        {panel.proposedStatement}
      </blockquote>
      <p className="mt-3 text-sm text-slate-700">
        The recorded statement is generated again from the undertaking and the reporting period when you finalise.
        Amounts stay in {panel.currency}. No conversion rate is applied.
      </p>
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        <span>
          I confirm, for the undertaking, that the information is supplied by the undertaking, the undertaking is
          responsible for its correctness, the declared reporting basis has been reviewed, and any paragraph 22
          omissions are the undertaking&apos;s own assessments.
        </span>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={!ready || !accepted || pending} onClick={finalise}>
          Finalise this report version
        </button>
        <a className="rounded border border-slate-300 px-3 py-2 text-sm" href={`/api/vsme/vs2026/report/${reportingPeriodId}/draft`}>
          Download draft JSON
        </a>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      {panel.snapshots.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-900">Final report versions</h3>
          <p className="mt-2 text-sm text-slate-700">
            Each revision can be downloaded as PDF, Excel, or JSON. Downloading does not create a new revision.
            This report is Option A for an explicitly declared first year. Comprehensive disclosures are not included.
            The information is the undertaking&apos;s. LibreVS does not provide external assurance.
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {panel.snapshots.map((snapshot) => (
              <li key={snapshot.id}>
                <p className="text-slate-800">
                  Revision {snapshot.revision}
                  <span className="text-slate-600"> · {snapshot.finalisedAt}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-3">
                  <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=pdf`}>
                    Download PDF report
                  </a>
                  <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=xlsx`}>
                    Download Excel report
                  </a>
                  <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=json`}>
                    Download JSON data
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
