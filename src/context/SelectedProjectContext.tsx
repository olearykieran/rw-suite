"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Define the context type.
interface SelectedProjectContextProps {
  selectedOrgId: string;
  selectedProjectId: string;
  selectedProjectName: string;
  selectedSubprojectId: string;
  selectedSubprojectName: string;
  updateSelectedOrg: (orgId: string) => void;
  updateSelectedProject: (projectId: string, projectName: string) => void;
  updateSelectedSubproject: (subprojectId: string, subprojectName: string) => void;
}

// Create the context.
const SelectedProjectContext = createContext<SelectedProjectContextProps | undefined>(
  undefined
);

// Provider component.
export const SelectedProjectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [selectedSubprojectId, setSelectedSubprojectId] = useState("");
  const [selectedSubprojectName, setSelectedSubprojectName] = useState("");

  const updateSelectedOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem("selectedOrgId", orgId);
  };

  const updateSelectedProject = (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    localStorage.setItem("selectedProjectId", projectId);
    localStorage.setItem("selectedProjectName", projectName);
    // **Clear any previously selected sub‑project**
    setSelectedSubprojectId("");
    setSelectedSubprojectName("");
    localStorage.removeItem("selectedSubProjectId");
    localStorage.removeItem("selectedSubProjectName");
  };

  const updateSelectedSubproject = (subprojectId: string, subprojectName: string) => {
    setSelectedSubprojectId(subprojectId);
    setSelectedSubprojectName(subprojectName);
    localStorage.setItem("selectedSubProjectId", subprojectId);
    localStorage.setItem("selectedSubProjectName", subprojectName);
  };

  return (
    <SelectedProjectContext.Provider
      value={{
        selectedOrgId,
        selectedProjectId,
        selectedProjectName,
        selectedSubprojectId,
        selectedSubprojectName,
        updateSelectedOrg,
        updateSelectedProject,
        updateSelectedSubproject,
      }}
    >
      {children}
    </SelectedProjectContext.Provider>
  );
};

// Custom hook to use the selected project context.
export function useSelectedProject() {
  const context = useContext(SelectedProjectContext);
  if (!context) {
    throw new Error("useSelectedProject must be used within a SelectedProjectProvider");
  }
  return context;
}
