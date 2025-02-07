// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/daily-reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

import {
  fetchAllDailyReports,
  deleteDailyReport,
  DailyReportDoc,
} from "@/lib/services/DailyReportService";
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function DailyReportListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  const [reports, setReports] = useState<DailyReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For fade-in animations
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllDailyReports(orgId, projectId, subProjectId);
        setReports(data);
      } catch (err: any) {
        console.error("Fetch daily reports error:", err);
        setError("Failed to load daily reports.");
      } finally {
        setLoading(false);
        // Trigger fade-in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(dailyReportId: string) {
    try {
      await deleteDailyReport(orgId, projectId, subProjectId, dailyReportId);
      setReports((prev) => prev.filter((r) => r.id !== dailyReportId));
    } catch (err: any) {
      console.error("Delete daily report error:", err);
      setError("Failed to delete daily report.");
    }
  }

  if (loading) {
    return <div className="p-6 ">Loading Daily Reports...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* === Section #1: Back Button & Title === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <div className="flex items-center justify-between">
          <GrayButton
            onClick={() => {
              setIsLoading(true);
              router.push(
                `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
              );
            }}
          >
            &larr; Back to Sub-Project
          </GrayButton>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
          <h1 className="text-2xl font-bold">Daily Reports</h1>
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports/new`}
            onClick={() => setIsLoading(true)}
          >
            <GrayButton>Create Daily Report</GrayButton>
          </Link>
        </div>
      </div>

      {/* === Section #2: List of Reports or Empty State === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        {reports.length === 0 ? (
          <p className=" text-neutral-600 dark:text-neutral-300 mt-2">
            No daily reports yet. Create one!
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {reports.map((r) => (
              <Card key={r.id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Date: {r.date}</p>
                  {r.weatherNote && <p>Weather: {r.weatherNote}</p>}
                  {r.location && <p>Location: {r.location}</p>}
                </div>
                <div className="flex gap-3">
                  <GrayButton
                    onClick={() => {
                      setIsLoading(true);
                      router.push(
                        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports/${r.id}`
                      );
                    }}
                    className="text-blue-600"
                  >
                    View
                  </GrayButton>
                  <GrayButton
                    onClick={() => handleDelete(r.id)}
                    className="text-xs bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </GrayButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
