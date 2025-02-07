"use client";

import { useState, useEffect } from "react";

/**
 * Helper function to safely get a value from localStorage.
 */
function getLS(key: string): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || "";
  }
  return "";
}

/**
 * Custom hook to retrieve the currently selected project and sub‑project from localStorage.
 * This hook listens for a custom "local-storage" event and updates state when that event fires.
 *
 * @returns An object with:
 *   - selectedProjectName: string
 *   - selectedSubprojectName: string
 */
export function useSelectedSubprojects() {
  const [selectedProjectName, setSelectedProjectName] = useState(
    getLS("selectedProjectName")
  );
  const [selectedSubprojectName, setSelectedSubprojectName] = useState(
    getLS("selectedSubProjectName")
  );

  useEffect(() => {
    const update = () => {
      setSelectedProjectName(getLS("selectedProjectName"));
      setSelectedSubprojectName(getLS("selectedSubProjectName"));
    };

    window.addEventListener("local-storage", update);
    return () => {
      window.removeEventListener("local-storage", update);
    };
  }, []);

  return { selectedProjectName, selectedSubprojectName };
}
