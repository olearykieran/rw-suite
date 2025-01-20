"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { useLoading } from "@/components/ui/LoadingProvider";

// Services
import { fetchAllSubmittals } from "@/lib/services/SubmittalService";

interface SubmittalItem {
  id: string;
  submittalNumber?: number;
  subject?: string;
  submittalType?: string;
  status?: string;
  importance?: string;
  assignedTo?: string;
  version?: number;
}

type FilterStatus = "all" | "draft" | "open" | "inReview" | "approved" | "closed";

export default function SubmittalsPage() {
  const { withLoading } = useLoading();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [submittals, setSubmittals] = useState<SubmittalItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter + pagination states
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [pageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Load submittals
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllSubmittals(orgId, projectId, subProjectId);
        setSubmittals(data as SubmittalItem[]);
      } catch (err: any) {
        console.error("fetchAllSubmittals error:", err);
        setError("Failed to load submittals.");
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadData();
  }, [orgId, projectId, subProjectId]);

  // 2. Filtering
  const filtered = submittals.filter((sub) => {
    if (filterStatus === "all") return true;
    if (!sub.status) return false;
    return sub.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // 3. Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = filtered.slice(startIndex, startIndex + pageSize);

  // 4. Error or loading?
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  // ---------- RENDER ----------
  return (
    <PageContainer>
      {/* === Back link === */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="
          text-sm font-medium text-blue-600 underline 
          hover:text-blue-700 dark:text-blue-400 
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Sub-Project
      </Link>

      {/* === Title & Buttons === */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">Submittals</h1>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/new`}
          >
            <GrayButton>Create New Submittal</GrayButton>
          </Link>
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/report`}
          >
            <GrayButton>Generate Report</GrayButton>
          </Link>
        </div>
      </div>

      {/* === Filter Controls === */}
      <Card className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Filter Submittals</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="font-medium" htmlFor="statusFilter">
            Filter by Status:
          </label>
          <select
            id="statusFilter"
            className="
              border p-2 rounded
              bg-white text-black
              dark:bg-neutral-800 dark:text-white
              transition-colors
            "
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as FilterStatus);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="inReview">In Review</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </Card>

      {/* === List of Submittals with AnimatedList === */}
      <AnimatedList
        items={pageData}
        isLoading={isInitialLoading}
        className="mt-4"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            No submittals match your filter.
          </p>
        }
        renderItem={(sub) => (
          <Card className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            {/* Left block with submittal details */}
            <div>
              <p className="font-semibold">
                Submittal #{sub.submittalNumber ?? "--"}: {sub.subject || "Untitled"}
              </p>
              {sub.submittalType && (
                <p className="text-sm mt-1">Type: {sub.submittalType}</p>
              )}
              <p className="text-sm">
                Status: <span className="capitalize">{sub.status || "N/A"}</span>
              </p>
              <p className="text-sm">
                Importance:{" "}
                <span className="capitalize">{sub.importance || "normal"}</span>
              </p>
              <p className="text-sm">Version: {sub.version || 1}</p>
              <p className="text-sm">
                Assigned To: {sub.assignedTo || <span className="opacity-75">N/A</span>}
              </p>
            </div>

            {/* Right block with actions */}
            <div className="flex gap-4">
              <Link
                href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/${sub.id}`}
                className="
                  text-blue-600 underline text-sm
                  hover:text-blue-700
                  dark:text-blue-400 dark:hover:text-blue-300
                "
              >
                View
              </Link>
              {/* If you want a delete button, you can replicate the finance approach. E.g.
              <GrayButton
                onClick={() => handleDeleteSubmittal(sub.id)}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                Delete
              </GrayButton>
              */}
            </div>
          </Card>
        )}
      />

      {/* === Pagination Controls === */}
      {filtered.length > pageSize && (
        <div className="flex gap-2 items-center mt-4">
          <GrayButton
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </GrayButton>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <GrayButton
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            Next
          </GrayButton>
        </div>
      )}
    </PageContainer>
  );
}
