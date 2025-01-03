// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/importexport/page.tsx

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import TasksHeaderNav from "@/components/TasksHeaderNav";

export default function TasksImportExportPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const [error, setError] = useState("");

  async function handleExport() {
    setError("");
    try {
      const res = await fetch(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks/importexport/api?mode=export`
      );
      if (!res.ok) {
        throw new Error(`Export error: ${res.status}`);
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasks-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Export error:", err);
      setError(err.message || "Failed to export tasks");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const res = await fetch(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/tasks/importexport/api?mode=import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonData),
        }
      );
      if (!res.ok) {
        throw new Error(`Import error: ${res.status}`);
      }
      alert("Tasks imported successfully!");
      e.target.value = "";
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Failed to import tasks");
    }
  }

  return (
    <PageContainer>
      <TasksHeaderNav orgId={orgId} projectId={projectId} subProjectId={subProjectId} />

      <h1 className="text-2xl font-bold">Tasks Import/Export</h1>
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <div className="space-y-3">
          <GrayButton onClick={handleExport}>Export Tasks to JSON</GrayButton>
          <div>
            <label className="block font-medium mb-1">Import JSON File</label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="
                file:mr-2 file:py-2 file:px-3 
                file:border-0 file:rounded 
                file:bg-gray-300 file:text-black
                hover:file:bg-gray-400
                dark:file:bg-gray-700 dark:file:text-white
                dark:hover:file:bg-gray-600
                transition-colors
              "
            />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
