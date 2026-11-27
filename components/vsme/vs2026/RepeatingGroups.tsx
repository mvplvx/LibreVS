"use client";

import { useState, useTransition } from "react";

import { statusLabel, useFieldAutosave } from "@/components/vsme/vs2026/useFieldAutosave";
import {
  createRepeatingRowAction,
  deleteRepeatingRowAction,
  reorderRepeatingRowAction,
  saveOmissionClaimAction,
  setRepeatingParentAction,
  updateRepeatingCellAction,
} from "@/lib/vsme/vs2026/editorActions";
import type { EditorControl, EditorMutationResult, EditorReadyView, EditorRepeatingGroupView, EditorSiteOption } from "@/lib/vsme/vs2026/editorView";
import { ISO_3166_ALPHA2 } from "@/lib/vsme/vs2026/iso3166Alpha2";

const inputClass = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const buttonClass = "rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";

export function RepeatingGroupEditor({
  group,
  periodId,
  sites,
  energyBreakdownLabel,
  omissionTargets,
  omissionReasons,
  enabled,
  refresh,
}: {
  group: EditorRepeatingGroupView;
  periodId: string;
  sites: EditorSiteOption[];
  energyBreakdownLabel: string;
  omissionTargets: EditorReadyView["omissionTargets"];
  omissionReasons: EditorReadyView["omissionReasons"];
  enabled: boolean;
  refresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [parentId, setParentId] = useState(sites[0]?.id ?? "");
  const [categoryKey, setCategoryKey] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const busy = !enabled || pending;

  function run(task: () => Promise<EditorMutationResult>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      setMessage(result.ok ? success : result.message);
      if (result.ok) {
        refresh();
      }
    });
  }

  async function ensureRow(): Promise<EditorMutationResult> {
    return createRepeatingRowAction(periodId, group.id, null);
  }

  if (group.id === "B1_OMITTED_DISCLOSURES") {
    return (
      <OmissionEditor
        group={group}
        periodId={periodId}
        targets={omissionTargets}
        reasons={omissionReasons}
        enabled={enabled}
        refresh={refresh}
      />
    );
  }

  return (
    <div className="mt-6 rounded border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{group.id}</h3>
      <p className="mt-1 text-sm text-slate-700">{group.statement}</p>
      {group.readOnlyNotice ? <p className="mt-2 text-sm text-slate-700">{group.readOnlyNotice}</p> : null}
      {group.energyMembers ? <p className="mt-2 text-sm text-slate-700">{energyBreakdownLabel}</p> : null}
      {group.readOnlyNotice && !group.categoryEntry ? (
        <OmissionList group={group} />
      ) : (
        <>
          {group.rows.map((row, index) => (
            <article key={row.id} className="mt-4 border-t border-slate-200 pt-4">
              <RepeatingRowForm
                group={group}
                row={row}
                periodId={periodId}
                sites={sites}
                enabled={enabled}
                busy={busy}
                canMoveUp={index > 0}
                canMoveDown={index < group.rows.length - 1}
                run={run}
              />
            </article>
          ))}
          {group.energyMembers && group.rows.length === 0 ? (
            <EnergyDraft
              members={group.energyMembers}
              busy={busy}
              onSave={(entries) => {
                run(async () => {
                  const created = await ensureRow();
                  if (!created.ok || !created.rowId) {
                    return created;
                  }
                  for (const entry of entries) {
                    if (entry.value.trim() === "") {
                      continue;
                    }
                    const saved = await updateRepeatingCellAction(
                      periodId,
                      created.rowId,
                      group.id,
                      entry.value,
                      entry.member,
                    );
                    if (!saved.ok) {
                      return saved;
                    }
                  }
                  return created;
                }, "Energy values were saved.");
              }}
            />
          ) : null}
          {group.categoryEntry ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
              <label className="text-sm text-slate-900">
                Category identity
                <input className={inputClass} value={categoryKey} disabled={busy} onChange={(event) => setCategoryKey(event.target.value)} />
              </label>
              <label className="text-sm text-slate-900">
                Quantity (tCO2eq)
                <input className={inputClass} inputMode="decimal" value={categoryValue} disabled={busy} onChange={(event) => setCategoryValue(event.target.value)} />
              </label>
              <button
                className={`${buttonClass} self-end`}
                type="button"
                disabled={busy}
                onClick={() => {
                  run(async () => {
                    const created = await ensureRow();
                    if (!created.ok || !created.rowId) {
                      return created;
                    }
                    return updateRepeatingCellAction(periodId, created.rowId, group.id, categoryValue, categoryKey);
                  }, "The category was saved.");
                }}
              >
                Add category
              </button>
            </div>
          ) : null}
          {!group.singleton && !group.readOnlyNotice ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {group.usesSite ? (
                <label className="text-sm text-slate-900">
                  B1 site
                  <select className={inputClass} value={parentId} disabled={busy || sites.length === 0} onChange={(event) => setParentId(event.target.value)}>
                    {sites.length === 0 ? <option value="">No B1 sites yet</option> : null}
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                className={buttonClass}
                type="button"
                disabled={busy || (group.usesSite && parentId === "")}
                onClick={() => {
                  run(
                    () => createRepeatingRowAction(periodId, group.id, group.usesSite ? parentId : null),
                    "The row was added.",
                  );
                }}
              >
                Add row
              </button>
            </div>
          ) : null}
        </>
      )}
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}

function OmissionList({ group }: { group: EditorRepeatingGroupView }) {
  if (group.rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-700">No stored omission rows.</p>;
  }
  return (
    <ul className="mt-2 space-y-2 text-sm text-slate-700">
      {group.rows.map((row) => (
        <li key={row.id}>
          Unverified stored row.{" "}
          {row.cells.map((cell) => `${cell.dimensionMember || cell.datapointId}: ${cell.value ?? ""}`).join("; ")}
        </li>
      ))}
    </ul>
  );
}

function RepeatingRowForm({
  group,
  row,
  periodId,
  sites,
  enabled,
  busy,
  canMoveUp,
  canMoveDown,
  run,
}: {
  group: EditorRepeatingGroupView;
  row: EditorRepeatingGroupView["rows"][number];
  periodId: string;
  sites: EditorSiteOption[];
  enabled: boolean;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  run: (task: () => Promise<EditorMutationResult>, success: string) => void;
}) {
  const storedKey = row.cells
    .map((cell) => `${cellKey(cell.datapointId, cell.dimensionMember)}=${cell.value ?? ""}`)
    .join("\n");
  const [stored, setStored] = useState(storedKey);
  const [values, setValues] = useState<Record<string, string>>(() => cellValues(row));
  const [parentId, setParentId] = useState(row.parentRowId ?? "");
  if (stored !== storedKey) {
    setStored(storedKey);
    setValues(cellValues(row));
    setParentId(row.parentRowId ?? "");
  }
  return (
    <div>
      {group.usesSite ? (
        <p className="text-sm text-slate-900">
          B1 site: <span className="font-medium">{row.parentLabel ?? "Not selected"}</span>
        </p>
      ) : null}
      <div className="mt-3 space-y-4">
        {row.cells.map((cell) => {
          const key = cellKey(cell.datapointId, cell.dimensionMember);
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-900" htmlFor={`${row.id}-${key}`}>
                {cell.label}
              </label>
              <p className="mt-1 text-xs text-slate-500">
                {cell.datapointId}
                {cell.dimensionMember ? ` · ${cell.dimensionMember}` : ""}
              </p>
              {cell.preparation ? (
                <p className="mt-1 text-xs text-slate-500">Preparation input. Saving it does not complete a disclosure.</p>
              ) : null}
              {cell.unavailableReason || !cell.control ? (
                <p className="mt-1 text-sm text-slate-700">{cell.unavailableReason}</p>
              ) : (
                <AutosavedCell
                  id={`${row.id}-${key}`}
                  periodId={periodId}
                  rowId={row.id}
                  datapointId={cell.datapointId}
                  dimensionMember={cell.dimensionMember}
                  control={cell.control}
                  unitLabel={cell.unitLabel}
                  stored={cell.value ?? ""}
                  updatedAt={cell.updatedAt}
                  enabled={enabled}
                />
              )}
            </div>
          );
        })}
      </div>
      {group.usesSite ? (
        <label className="mt-4 block text-sm text-slate-900">
          Change B1 site
          <select className={inputClass} value={parentId} disabled={busy} onChange={(event) => setParentId(event.target.value)}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={buttonClass}
          type="button"
          disabled={busy}
          onClick={() => {
            run(async () => {
              if (group.usesSite && parentId !== "" && parentId !== row.parentRowId) {
                const parent = await setRepeatingParentAction(periodId, row.id, parentId);
                if (!parent.ok) {
                  return parent;
                }
              }
              for (const cell of row.cells) {
                if (!cell.control) {
                  continue;
                }
                const key = cellKey(cell.datapointId, cell.dimensionMember);
                const next = values[key] ?? "";
                const previous = cell.value ?? "";
                if (next === previous) {
                  continue;
                }
                const saved = await updateRepeatingCellAction(
                  periodId,
                  row.id,
                  cell.datapointId,
                  next.trim() === "" ? null : next,
                  cell.dimensionMember === "" ? null : cell.dimensionMember,
                );
                if (!saved.ok) {
                  return saved;
                }
              }
              return { ok: true, code: "SAVED" };
            }, "The row was saved.");
          }}
        >
          {busy ? "Saving…" : "Save row"}
        </button>
        {!group.singleton ? (
          <>
            <button className={buttonClass} type="button" disabled={busy || !canMoveUp} onClick={() => run(() => reorderRepeatingRowAction(periodId, row.id, "up"), "The row was moved.")}>
              Move up
            </button>
            <button className={buttonClass} type="button" disabled={busy || !canMoveDown} onClick={() => run(() => reorderRepeatingRowAction(periodId, row.id, "down"), "The row was moved.")}>
              Move down
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm("Delete this row? Related disclosures that still reference a site must be updated first.")) {
                  return;
                }
                run(() => deleteRepeatingRowAction(periodId, row.id), "The row was deleted.");
              }}
            >
              Delete row
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function EnergyDraft({
  members,
  busy,
  onSave,
}: {
  members: string[];
  busy: boolean;
  onSave: (entries: { member: string; value: string }[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div className="mt-4 space-y-4">
      {members.map((member) => (
        <label key={member} className="block text-sm font-medium text-slate-900">
          {member}
          <input
            className={inputClass}
            inputMode="decimal"
            value={values[member] ?? ""}
            disabled={busy}
            onChange={(event) => setValues((current) => ({ ...current, [member]: event.target.value }))}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">MWh. A blank member stays missing.</span>
        </label>
      ))}
      <button
        className={buttonClass}
        type="button"
        disabled={busy}
        onClick={() => onSave(members.map((member) => ({ member, value: values[member] ?? "" })))}
      >
        Save energy values
      </button>
    </div>
  );
}

function AutosavedCell({
  id,
  periodId,
  rowId,
  datapointId,
  dimensionMember,
  control,
  unitLabel,
  stored,
  updatedAt,
  enabled,
}: {
  id: string;
  periodId: string;
  rowId: string;
  datapointId: string;
  dimensionMember: string;
  control: EditorControl;
  unitLabel: string | null;
  stored: string;
  updatedAt: string | null;
  enabled: boolean;
}) {
  const autosave = useFieldAutosave({
    stored,
    updatedAt,
    enabled,
    save: (draft, expectedUpdatedAt, overwrite) =>
      updateRepeatingCellAction(
        periodId,
        rowId,
        datapointId,
        draft.trim() === "" ? null : draft,
        dimensionMember === "" ? null : dimensionMember,
        expectedUpdatedAt,
        overwrite,
      ),
  });
  return (
    <>
      <CellControl id={id} control={control} unitLabel={unitLabel} value={autosave.draft} disabled={!enabled} onChange={autosave.edit} />
      <p className="mt-1 text-xs text-slate-500">{statusLabel(autosave.status)}</p>
      {autosave.message ? <p className="mt-1 text-sm text-slate-700">{autosave.message}</p> : null}
      {autosave.status === "conflict" ? (
        <button className={`${buttonClass} mt-2`} type="button" onClick={autosave.replaceStored}>
          Replace stored value
        </button>
      ) : null}
    </>
  );
}

function OmissionEditor({
  group,
  periodId,
  targets,
  reasons,
  enabled,
  refresh,
}: {
  group: EditorRepeatingGroupView;
  periodId: string;
  targets: EditorReadyView["omissionTargets"];
  reasons: EditorReadyView["omissionReasons"];
  enabled: boolean;
  refresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [datapointId, setDatapointId] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState<string>(reasons[0]?.point ?? "");
  const [conditionsAssessed, setConditionsAssessed] = useState(false);
  const [reassessed, setReassessed] = useState(false);
  const busy = !enabled || pending;
  return (
    <div className="mt-6 rounded border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{group.id}</h3>
      <p className="mt-1 text-sm text-slate-700">{group.statement}</p>
      <p className="mt-2 text-sm text-slate-700">{group.readOnlyNotice}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {group.rows.map((row) =>
          row.cells.map((cell) => (
            <li key={row.id + cell.dimensionMember}>
              {cell.value} · {cell.dimensionMember} · {cell.label}
              <button
                className="ml-3 rounded border border-slate-300 px-2 py-1 text-xs"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Delete this omission claim?")) {
                    return;
                  }
                  setMessage(null);
                  startTransition(async () => {
                    const result = await deleteRepeatingRowAction(periodId, row.id);
                    setMessage(result.ok ? "The omission claim was deleted." : result.message);
                    if (result.ok) {
                      refresh();
                    }
                  });
                }}
              >
                Delete
              </button>
            </li>
          )),
        )}
      </ul>
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-slate-900">
          Datapoint to omit
          <select className={inputClass} value={datapointId} disabled={busy} onChange={(event) => setDatapointId(event.target.value)}>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-900">
          Paragraph 22 reason
          <select className={inputClass} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value as typeof reason)}>
            {reasons.map((item) => (
              <option key={item.point} value={item.point}>
                {item.point}: {item.text}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={conditionsAssessed} disabled={busy} onChange={(event) => setConditionsAssessed(event.target.checked)} />
          The claimed legal grounds have been assessed. This is the undertaking&apos;s attestation, not an independent legal approval.
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={reassessed} disabled={busy} onChange={(event) => setReassessed(event.target.checked)} />
          The omission has been reassessed for this reporting period.
        </label>
        <button
          className={buttonClass}
          type="button"
          disabled={busy || datapointId === "" || reason === ""}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await saveOmissionClaimAction(periodId, datapointId, reason, conditionsAssessed, reassessed, null);
              setMessage(result.ok ? "The omission claim was saved." : result.message);
              if (result.ok) {
                setConditionsAssessed(false);
                setReassessed(false);
                refresh();
              }
            });
          }}
        >
          {pending ? "Saving…" : "Save omission claim"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}

function CellControl({
  id,
  control,
  unitLabel,
  value,
  disabled,
  onChange,
}: {
  id: string;
  control: EditorRepeatingGroupView["rows"][number]["cells"][number]["control"];
  unitLabel: string | null;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (!control) {
    return null;
  }
  if (control.kind === "narrative") {
    return <textarea id={id} className={inputClass} rows={3} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
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
      <>
        <p className="mt-1 text-xs text-slate-500">Point coordinates only. Polygons are not stored, and an address is not geocoded.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input id={id} className={inputClass} inputMode="decimal" placeholder="Latitude" value={latitude} disabled={disabled} onChange={(event) => onChange(event.target.value === "" && longitude === "" ? "" : `${event.target.value},${longitude}`)} />
          <input className={inputClass} inputMode="decimal" placeholder="Longitude" aria-label="Longitude" value={longitude} disabled={disabled} onChange={(event) => onChange(latitude === "" && event.target.value === "" ? "" : `${latitude},${event.target.value}`)} />
        </div>
      </>
    );
  }
  if (control.kind === "pollutantName" || control.kind === "legalForm" || control.kind === "url") {
    return <input id={id} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
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
  return (
    <>
      <input id={id} className={inputClass} inputMode={control.kind === "number" || control.kind === "percentage" || control.kind === "monetary" ? "decimal" : "text"} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {unitLabel ? <p className="mt-1 text-xs text-slate-500">{unitLabel}</p> : null}
    </>
  );
}

function cellKey(datapointId: string, dimensionMember: string): string {
  return `${datapointId}\u0000${dimensionMember}`;
}

function cellValues(row: EditorRepeatingGroupView["rows"][number]): Record<string, string> {
  return Object.fromEntries(row.cells.map((cell) => [cellKey(cell.datapointId, cell.dimensionMember), cell.value ?? ""]));
}
