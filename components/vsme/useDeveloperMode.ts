"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "librevs:developer-mode";

export function useDeveloperMode(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  const setDeveloperMode = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  return [enabled, setDeveloperMode];
}
