"use client";

import { useState } from "react";
import { useCreateReportingPeriod } from "./queries/useCreateReportingPeriod";

type CreateReportingPeriodCtaProps = {
  companyId: string;
  companyName: string;
  existingYears: number[];
  onCreated: (periodId: string) => void;
};

export function CreateReportingPeriodCta({
  companyId,
  companyName,
  existingYears,
  onCreated,
}: CreateReportingPeriodCtaProps) {
  const createMutation = useCreateReportingPeriod();
  const defaultYear = new Date().getFullYear();
  const [year, setYear] = useState(defaultYear);

  const handleCreate = async () => {
    if (existingYears.includes(year)) {
      return;
    }
    try {
      const period = await createMutation.mutateAsync({ companyId, year });
      onCreated(period.id);
    } catch {
      /* error via createMutation.error */
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
      <p className="text-sm font-medium text-slate-800">No reporting period yet</p>
      <p className="mt-1 text-xs text-slate-600">
        Create a period for {companyName} to start VSME data entry and export.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">
          Year
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 block w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={
            createMutation.isPending || existingYears.includes(year)
          }
          onClick={handleCreate}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating…" : "Create reporting period"}
        </button>
      </div>
      {existingYears.includes(year) ? (
        <p className="mt-2 text-xs text-amber-700">
          A period for {year} already exists for this company.
        </p>
      ) : null}
      {createMutation.error ? (
        <p className="mt-2 text-xs text-red-700">{createMutation.error.message}</p>
      ) : null}
    </div>
  );
}
