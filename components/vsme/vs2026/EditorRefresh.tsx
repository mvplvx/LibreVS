"use client";

import { useRouter } from "next/navigation";

import type { EditorReadyView } from "@/lib/vsme/vs2026/editorView";
import type { VS2026ReportPanel } from "@/lib/vsme/vs2026/reportDataset";
import type { VS2026ReportingState } from "@/lib/vsme/vs2026/reportingState";

import { Vs2026Editor } from "./Vs2026Editor";

export function EditorRefresh({
  view,
  reportingState,
  reportPanel,
}: {
  view: EditorReadyView;
  reportingState: VS2026ReportingState | null;
  reportPanel: VS2026ReportPanel | null;
}) {
  const router = useRouter();
  return (
    <Vs2026Editor
      view={view}
      reportingState={reportingState}
      reportPanel={reportPanel}
      refresh={() => router.refresh()}
    />
  );
}
