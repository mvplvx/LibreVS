"use client";

import { useRouter } from "next/navigation";

import type { EditorReadyView } from "@/lib/vsme/vs2026/editorView";

import { Vs2026Editor } from "./Vs2026Editor";

export function EditorRefresh({ view }: { view: EditorReadyView }) {
  const router = useRouter();
  return <Vs2026Editor view={view} refresh={() => router.refresh()} />;
}
