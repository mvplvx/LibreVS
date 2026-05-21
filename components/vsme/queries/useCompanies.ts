"use client";

/**
 * VSME orchestration: React Query only. Transport via apiGet in queryFn.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { CompanyRecord } from "./types";

export function useCompanies() {
  return useQuery({
    queryKey: vsmeKeys.companies(),
    queryFn: () => apiGet<CompanyRecord[]>("/api/company"),
  });
}
