// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/submittals/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAllSubmittals } from "@/lib/services/SubmittalService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

export default function SubmittalsPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [submittals, setSubmittals] = useState<SubmittalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For filtering
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "open" | "inReview" | "approved" | "closed"
  >("all");

  // Pagination
  const [pageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllSubmittals(orgId, projectId, subProjectId);
        setSubmittals(data as SubmittalItem[]);
      } catch (err: any) {
        console.error("fetchAllSubmittals error:", err);
        setError("Failed to load submittals");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId, projectId, subProjectId]);

  if (loading) {
    return <div className="p-6">Loading Submittals...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  // Filter
  const filtered = submittals.filter((sub) => {
    if (filterStatus === "all") return true;
    if (!sub.status) return false;
    return sub.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <PageContainer>
      {/* Back link */}
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

      {/* Title & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

      {/* Filter Card */}
      <Card>
        <h2 className="text-lg font-semibold">Filter Submittals</h2>
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
              setFilterStatus(e.target.value as any);
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

      {/* No results */}
      {filtered.length === 0 && (
        <p className="text-sm text-neutral-600">No submittals match your filter.</p>
      )}

      {/* Table / Cards */}
      {filtered.length > 0 && (
        <>
          {/* Table (desktop) */}
          <div
            className="
              hidden sm:block
              overflow-x-auto
              bg-white dark:bg-neutral-900
              border border-neutral-200 dark:border-neutral-800
              rounded-lg
            "
          >
            <table className="w-full min-w-[700px]">
              <thead className="border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">#</th>
                  <th className="p-3 text-left text-sm font-medium">Subject</th>
                  <th className="p-3 text-left text-sm font-medium">Type</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Importance</th>
                  <th className="p-3 text-left text-sm font-medium">Version</th>
                  <th className="p-3 text-left text-sm font-medium">Assigned To</th>
                  <th className="p-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <td className="p-3">{sub.submittalNumber || "--"}</td>
                    <td className="p-3">{sub.subject}</td>
                    <td className="p-3">{sub.submittalType}</td>
                    <td className="p-3 capitalize">{sub.status}</td>
                    <td className="p-3 capitalize">{sub.importance}</td>
                    <td className="p-3">{sub.version || 1}</td>
                    <td className="p-3">{sub.assignedTo || "N/A"}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/${sub.id}`}
                        className="
                          text-blue-600 underline
                          hover:text-blue-700
                          dark:text-blue-400 dark:hover:text-blue-300
                        "
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view (mobile) */}
          <div className="block sm:hidden space-y-3">
            {pageData.map((sub) => (
              <div
                key={sub.id}
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-800
                  rounded p-3 shadow-sm hover:shadow-md
                  transition
                "
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">
                    Submittal #{sub.submittalNumber || "--"}
                  </h2>
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
                </div>
                <p className="text-sm mt-1">
                  <strong>Subject:</strong> {sub.subject}
                </p>
                <p className="text-sm">
                  <strong>Type:</strong> {sub.submittalType}
                </p>
                <p className="text-sm">
                  <strong>Status:</strong> {sub.status}
                </p>
                <p className="text-sm">
                  <strong>Importance:</strong> {sub.importance}
                </p>
                <p className="text-sm">
                  <strong>Version:</strong> {sub.version || 1}
                </p>
                <p className="text-sm">
                  <strong>Assigned To:</strong> {sub.assignedTo || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div className="flex gap-2 items-center">
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
