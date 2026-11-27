"use client";

import { useState, useTransition } from "react";

import {
  saveComparativeBasisAction,
  saveEmployeeMeasureAction,
  saveOptionAAction,
  saveScalarAction,
} from "@/lib/vsme/vs2026/editorActions";
import { FinalisationPanel } from "@/components/vsme/vs2026/FinalisationPanel";
import { RepeatingGroupEditor } from "@/components/vsme/vs2026/RepeatingGroups";
import { ReviewPanel } from "@/components/vsme/vs2026/ReviewPanel";
import { statusLabel, useFieldAutosave } from "@/components/vsme/vs2026/useFieldAutosave";
import type { EditorControl, EditorFieldView, EditorMutationResult, EditorReadyView } from "@/lib/vsme/vs2026/editorView";
import type { VS2026ReportPanel } from "@/lib/vsme/vs2026/reportDataset";
import type { VS2026ReportingState } from "@/lib/vsme/vs2026/reportingState";
import { ISO_3166_ALPHA2 } from "@/lib/vsme/vs2026/iso3166Alpha2";

const inputClass = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const buttonClass = "rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";

export function Vs2026Editor({
  view,
  refresh,
  reportingState = null,
  reportPanel = null,
}: {
  view: EditorReadyView;
  refresh: () => void;
  reportingState?: VS2026ReportingState | null;
  reportPanel?: VS2026ReportPanel | null;
}) {
  const factsOpen = view.configurationStatus === "OPTION_A";
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">VS 2026 Basic Module</h1>
        <p className="mt-3 text-sm text-slate-700">
          This editor stores reported values. It is not a legal compliance assessment. Saving Option A
          designates this period for VS 2026. Until that save, the period stays on the legacy
          workspace. After that save, the legacy form and legacy exports cannot change or publish it.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Item term="Reporting period" value={periodLabel(view)} />
          <Item term="Reporting option" value={optionLabel(view)} />
          <Item term="Configuration" value={configurationLabel(view)} />
          <Item
            term="Employee proportionality"
            value={view.employeeMeasure === null ? "Not provided" : view.employeeMeasure}
          />
          <Item term="Employee-size category" value={view.employeeCategoryLabel} />
        </dl>
        <p className="mt-4 text-sm text-slate-700">
          {view.additionalComprehensiveDisclosures.length === 0
            ? "No additional Comprehensive disclosures are selected."
            : `Additional Comprehensive selections kept on this period: ${view.additionalComprehensiveDisclosures.join(", ")}. Their data is not edited here.`}
        </p>
        <p className="mt-3 text-sm">
          <a className="text-slate-900 underline" href={view.previewHref}>
            Open the diagnostic preview for this period.
          </a>{" "}
          <span className="text-slate-600">The preview has its own enablement switch.</span>
        </p>
      </section>

      <OptionSection view={view} refresh={refresh} />
      <EmployeeSection view={view} refresh={refresh} enabled={factsOpen} />
      <ComparativeSection view={view} refresh={refresh} enabled={factsOpen} />
      {reportingState?.ok ? <ReviewPanel state={reportingState} /> : null}
      {reportingState?.ok && reportPanel && view.configurationStatus === "OPTION_A" ? (
        <FinalisationPanel
          reportingPeriodId={view.reportingPeriodId}
          state={reportingState}
          panel={reportPanel}
          refresh={refresh}
        />
      ) : null}

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Basic Module">
        <a className="rounded border border-slate-300 bg-white px-2 py-1" href="#vs2026-review">
          Review
        </a>
        <a className="rounded border border-slate-300 bg-white px-2 py-1" href="#vs2026-finalisation">
          Report
        </a>
        {view.disclosures.map((disclosure) => (
          <a key={disclosure.id} className="rounded border border-slate-300 bg-white px-2 py-1" href={`#vs2026-${disclosure.id}`}>
            {disclosure.id}
          </a>
        ))}
      </nav>

      {view.disclosures.map((disclosure) => (
        <section key={disclosure.id} id={`vs2026-${disclosure.id}`} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {disclosure.id}. {disclosure.title}
          </h2>
          {disclosure.fields.length === 0 ? (
            <p className="mt-3 text-sm text-slate-700">No scalar fields in this disclosure are editable here.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {disclosure.fields.map((field) => (
                <ScalarField key={field.id} field={field} periodId={view.reportingPeriodId} enabled={factsOpen} refresh={refresh} />
              ))}
            </div>
          )}
          {disclosure.unavailable.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">Not edited here</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {disclosure.unavailable.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium text-slate-900">{item.id}</span> — {item.label}{" "}
                    <span className="text-slate-500">({item.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {view.repeatingGroups
            .filter((group) => group.disclosureId === disclosure.id)
            .map((group) => (
              <RepeatingGroupEditor
                key={group.id}
                group={group}
                periodId={view.reportingPeriodId}
                sites={view.sites}
                energyBreakdownLabel={view.energyBreakdownLabel}
                omissionTargets={view.omissionTargets}
                omissionReasons={view.omissionReasons}
                enabled={factsOpen}
                refresh={refresh}
              />
            ))}
          {disclosure.repeating.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">Registry contents</h3>
              <ul className="mt-2 space-y-3 text-sm text-slate-700">
                {disclosure.repeating.map((group) => (
                  <li key={group.id}>
                    <p>
                      <span className="font-medium text-slate-900">{group.id}</span> — {group.statement}
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      {group.components.map((component) => (
                        <li key={component.id}>
                          {component.id}: {component.label}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function OptionSection({ view, refresh }: { view: EditorReadyView; refresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Option A — Basic Module</h2>
      <p className="mt-2 text-sm text-slate-700">
        Option A covers disclosures B1 to B11. Saving it does not complete the report. Option B is
        not offered here. A period that already stores Option B is left unchanged.
      </p>
      <button
        className={`${buttonClass} mt-4`}
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await saveOptionAAction(view.reportingPeriodId);
            setMessage(resultMessage(result, "Option A was saved."));
            if (result.ok) {
              refresh();
            }
          });
        }}
      >
        {pending ? "Saving…" : "Save Option A"}
      </button>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}

function ComparativeSection({
  view,
  refresh,
  enabled,
}: {
  view: EditorReadyView;
  refresh: () => void;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(view.comparativeBasis === "UNKNOWN" ? "" : view.comparativeBasis);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  function save(next: "FIRST_YEAR" | "SUBSEQUENT" | null) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveComparativeBasisAction(view.reportingPeriodId, next, confirmed);
      setMessage(
        resultMessage(
          result,
          next === null ? "The reporting-year basis was cleared." : "The reporting-year basis was saved.",
        ),
      );
      if (result.ok) {
        setConfirmed(false);
        refresh();
      }
    });
  }
  return (
    <section id="vs2026-comparative" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">First-year or subsequent reporting</h2>
      <p className="mt-2 text-sm text-slate-700">
        Comparative information is required from the second year of reporting, with an exception for
        metrics disclosed for the first time. A new period in this database is not treated as a first
        year. This statement is not stored until you confirm it. It does not copy earlier values, and
        it does not create a reference to an unchanged datapoint in an earlier report.
      </p>
      <label className="mt-4 block text-sm font-medium text-slate-900" htmlFor="vs2026-comparative-basis">
        Reporting-year basis
      </label>
      <select
        id="vs2026-comparative-basis"
        className={inputClass}
        value={value}
        disabled={!enabled || pending}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="">Not stated</option>
        <option value="FIRST_YEAR">First year of reporting under this standard</option>
        <option value="SUBSEQUENT">Subsequent reporting year</option>
      </select>
      <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={confirmed}
          disabled={!enabled || pending}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I confirm this basis for the selected period. The confirmation is not stored as audit evidence.
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={buttonClass}
          type="button"
          disabled={!enabled || pending || value === "" || !confirmed}
          onClick={() => {
            if (value === "FIRST_YEAR" || value === "SUBSEQUENT") {
              save(value);
            }
          }}
        >
          {pending ? "Saving…" : "Save reporting-year basis"}
        </button>
        <button
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          type="button"
          disabled={!enabled || pending || !confirmed}
          onClick={() => save(null)}
        >
          Clear
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}

function EmployeeSection({
  view,
  refresh,
  enabled,
}: {
  view: EditorReadyView;
  refresh: () => void;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(view.employeeMeasure ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  function save(next: string | null) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveEmployeeMeasureAction(view.reportingPeriodId, next, confirmed);
      setMessage(
        resultMessage(result, next === null ? "The measure was cleared." : "The measure was saved."),
      );
      if (result.ok) {
        if (next === null) {
          setValue("");
        }
        setConfirmed(false);
        refresh();
      }
    });
  }
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Employee proportionality</h2>
      <p className="mt-2 text-sm text-slate-700">
        Enter the figure used only to distinguish 10 employees or fewer from more than 10 employees.
        It is not copied from the company workforce field, from B1, or from B8. The reporting
        undertaking is responsible for the source and accuracy of the figure. Confirmation is
        required before saving and is not stored as audit evidence. An empty value clears the
        measure. It does not become zero.
      </p>
      {view.employeeLocked ? (
        <p className="mt-3 text-sm text-slate-700">
          A stored value from the running VSME workspace is protected and is not shown as this measure.
        </p>
      ) : (
        <>
          <label className="mt-4 block text-sm font-medium text-slate-900" htmlFor="vs2026-employee-measure">
            Proportionality measure
          </label>
          <input
            id="vs2026-employee-measure"
            className={inputClass}
            inputMode="decimal"
            value={value}
            disabled={!enabled || pending}
            onChange={(event) => setValue(event.target.value)}
          />
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              disabled={!enabled || pending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I confirm this figure is the proportionality measure for this reporting period.
          </label>
          <div className="mt-4 flex gap-2">
            <button
              className={buttonClass}
              type="button"
              disabled={!enabled || pending || !confirmed}
              onClick={() => save(value.trim() === "" ? null : value)}
            >
              {pending ? "Saving…" : "Save measure"}
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
              type="button"
              disabled={!enabled || pending || !confirmed}
              onClick={() => save(null)}
            >
              Clear measure
            </button>
          </div>
        </>
      )}
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}

function ScalarField({
  field,
  periodId,
  enabled,
}: {
  field: EditorFieldView;
  periodId: string;
  enabled: boolean;
  refresh: () => void;
}) {
  const autosave = useFieldAutosave({
    stored: field.value ?? "",
    updatedAt: field.updatedAt,
    enabled: enabled && !field.locked,
    save: (draft, expectedUpdatedAt, overwrite) =>
      saveScalarAction(periodId, field.id, draft.trim() === "" ? null : draft, expectedUpdatedAt, overwrite),
  });
  const inputId = `vs2026-${field.id}`;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900" htmlFor={inputId}>
        {field.label}
      </label>
      <p className="mt-1 text-xs text-slate-500">
        {field.id} · Paragraph {field.paragraph}
      </p>
      {field.preparation ? (
        <p className="mt-1 text-xs text-slate-500">Preparation input. Saving it does not complete a disclosure.</p>
      ) : null}
      {field.control.kind === "legalForm" ? (
        <p className="mt-1 text-xs text-slate-500">
          Describe the undertaking&apos;s legal form. National forms differ. This is not the registration number.
        </p>
      ) : null}
      {field.control.kind === "naceCodes" ? (
        <p className="mt-1 text-xs text-slate-500">
          One NACE Rev. 2 division, group, or class code per line, such as 01, 01.1, or 01.11. Codes are not inferred from the company industry.
        </p>
      ) : null}
      {field.control.kind === "url" ? (
        <p className="mt-1 text-xs text-slate-500">
          A syntactically valid link is stored as entered. It does not prove that the document contains the required information, and the application does not open it.
        </p>
      ) : null}
      {field.id === "B7_WASTE_DIVERTED_PROPORTION" ? (
        <p className="mt-1 text-xs text-slate-500">
          This is the paragraph 39(b) proportion. It is entered directly and is not calculated from the separate digital recycling percentages. Undertakings with 10 employees or fewer keep the existing relief.
        </p>
      ) : null}
      {field.locked ? (
        <p className="mt-2 text-sm text-slate-700">
          A stored value from the running VSME workspace is protected and is not shown as a VS 2026 fact.
        </p>
      ) : (
        <>
          <Control id={inputId} control={field.control} value={autosave.draft} disabled={!enabled} onChange={autosave.edit} />
          <p className="mt-2 text-xs text-slate-500">{statusLabel(autosave.status)}</p>
          {autosave.status === "conflict" ? (
            <button className={`${buttonClass} mt-2`} type="button" onClick={autosave.replaceStored}>
              Replace stored value
            </button>
          ) : null}
        </>
      )}
      {autosave.message ? <p className="mt-2 text-sm text-slate-700">{autosave.message}</p> : null}
    </div>
  );
}

function Control({
  id,
  control,
  value,
  disabled,
  onChange,
}: {
  id: string;
  control: EditorControl;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (control.kind === "naceCodes") {
    const shown = naceLines(value);
    return (
      <textarea
        id={id}
        className={inputClass}
        rows={4}
        value={shown}
        disabled={disabled}
        onChange={(event) => {
          const codes = event.target.value.split("\n").map((line) => line.trim()).filter((line) => line !== "");
          onChange(codes.length === 0 ? "" : JSON.stringify(codes));
        }}
      />
    );
  }
  if (control.kind === "country") {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (
      <select id={id} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Unanswered</option>
        {ISO_3166_ALPHA2.map((code) => (
          <option key={code} value={code}>
            {names.of(code)} ({code})
          </option>
        ))}
      </select>
    );
  }
  if (control.kind === "coordinates") {
    const [latitude = "", longitude = ""] = value.split(",");
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <input id={id} className={inputClass} inputMode="decimal" placeholder="Latitude" value={latitude} disabled={disabled} onChange={(event) => onChange(joinCoordinates(event.target.value, longitude))} />
        <input className={inputClass} inputMode="decimal" placeholder="Longitude" aria-label="Longitude" value={longitude} disabled={disabled} onChange={(event) => onChange(joinCoordinates(latitude, event.target.value))} />
      </div>
    );
  }
  if (control.kind === "narrative") {
    return (
      <textarea id={id} className={inputClass} rows={4} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    );
  }
  if (control.kind === "boolean") {
    return (
      <select id={id} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Unanswered</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (control.kind === "enumeration") {
    return (
      <select id={id} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Unanswered</option>
        {control.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.legalText}
          </option>
        ))}
      </select>
    );
  }
  const unit =
    control.kind === "number" || control.kind === "percentage"
      ? control.rule.unitLabel
      : control.kind === "monetary"
        ? "Reporting currency"
        : null;
  return (
    <>
      <input id={id} className={inputClass} inputMode={control.kind === "number" || control.kind === "percentage" || control.kind === "monetary" ? "decimal" : "text"} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {unit ? <p className="mt-1 text-xs text-slate-500">{unit}</p> : null}
    </>
  );
}

function naceLines(value: string): string {
  if (value.trim() === "") {
    return "";
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed.join("\n");
    }
  } catch {
    return value;
  }
  return value;
}

function joinCoordinates(latitude: string, longitude: string): string {
  if (latitude.trim() === "" && longitude.trim() === "") {
    return "";
  }
  return `${latitude},${longitude}`;
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{term}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function periodLabel(view: EditorReadyView): string {
  const year = view.year === null ? "Year not set" : String(view.year);
  return view.companyName ? `${view.companyName}, ${year}` : year;
}

function optionLabel(view: EditorReadyView): string {
  return view.configurationStatus === "OPTION_A" ? "Option A — Basic Module" : "Reporting option not configured";
}

function configurationLabel(view: EditorReadyView): string {
  return view.configurationStatus === "OPTION_A" ? "Saved" : "Not configured";
}

function resultMessage(result: EditorMutationResult, success: string): string {
  return result.ok ? success : result.message;
}
