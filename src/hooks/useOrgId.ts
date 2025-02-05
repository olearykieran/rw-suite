// src/hooks/useOrgId.ts
"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Custom hook to retrieve the effective organization ID.
 * It first checks the URL params (which Next.js provides via useParams) and,
 * if not present, falls back to localStorage (which your app sets when a subproject is selected).
 */
export function useOrgId(): string {
  const params = useParams() as { orgId?: string };
  const orgIdFromParams = params.orgId || "";
  // When rendering on the client, fallback to localStorage.
  const orgIdFromLocal =
    typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") || "" : "";

  // Return the organization ID from params if available; otherwise, fallback.
  return useMemo(
    () => orgIdFromParams || orgIdFromLocal,
    [orgIdFromParams, orgIdFromLocal]
  );
}
