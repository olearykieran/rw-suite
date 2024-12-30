// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/daily-reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchAllDailyReports,
  deleteDailyReport,
  DailyReportDoc,
} from "@/lib/services/DailyReportService";

export default function DailyReportListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [reports, setReports] = useState<DailyReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAllDailyReports(orgId, projectId, subProjectId);
        setReports(data);
      } catch (err: any) {
        console.error("Fetch daily reports error:", err);
        setError("Failed to load daily reports.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId) {
      load();
    }
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(reportId: string) {
    try {
      await deleteDailyReport(orgId, projectId, subProjectId, reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      console.error("Delete daily report error:", err);
      setError("Failed to delete daily report.");
    }
  }

  if (loading) return <div className="p-4">Loading Daily Reports...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Project
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Daily Reports</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Daily Report
        </Link>
      </div>

      {reports.length === 0 ? (
        <p>No daily reports yet. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">Date: {r.date}</p>
                {r.weatherNote && (
                  <p className="text-sm text-gray-600">Weather: {r.weatherNote}</p>
                )}
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports/${r.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
