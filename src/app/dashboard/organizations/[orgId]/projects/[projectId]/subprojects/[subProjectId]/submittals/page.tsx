// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/submittals/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

export default function SubmittalsPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [submittals, setSubmittals] = useState<SubmittalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For filtering + pagination
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "open" | "inReview" | "approved" | "closed"
  >("all");
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

  if (loading) return <div className="p-4">Loading Submittals...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

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
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Project
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold">Submittals</h1>

        <div className="flex gap-3">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/new`}
            className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
          >
            Create New Submittal
          </Link>
          {/* Simple link to a “report” page */}
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/report`}
            className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <label className="font-medium">Filter by Status:</label>
        <select
          className="border p-2"
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

      {filtered.length === 0 && (
        <p className="text-gray-700">No submittals match your filter.</p>
      )}

      {filtered.length > 0 && (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border min-w-[700px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Subject</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Importance</th>
                  <th className="p-2 text-left">Version</th>
                  <th className="p-2 text-left">Assigned To</th>
                  <th className="p-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((sub) => (
                  <tr key={sub.id} className="border-b">
                    <td className="p-2">{sub.submittalNumber || "--"}</td>
                    <td className="p-2">{sub.subject}</td>
                    <td className="p-2">{sub.submittalType}</td>
                    <td className="p-2 capitalize">{sub.status}</td>
                    <td className="p-2 capitalize">{sub.importance}</td>
                    <td className="p-2">{sub.version || 1}</td>
                    <td className="p-2">{sub.assignedTo || "N/A"}</td>
                    <td className="p-2">
                      <Link
                        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/${sub.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card */}
          <div className="block sm:hidden space-y-3">
            {pageData.map((sub) => (
              <div
                key={sub.id}
                className="border rounded p-3 bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">
                    Submittal #{sub.submittalNumber || "--"}
                  </h2>
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals/${sub.id}`}
                    className="text-blue-600 underline text-sm"
                  >
                    View
                  </Link>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Subject:</strong> {sub.subject}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Type:</strong> {sub.submittalType}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Status:</strong> {sub.status}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Importance:</strong> {sub.importance}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Version:</strong> {sub.version || 1}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Assigned To:</strong> {sub.assignedTo || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination controls */}
      {filtered.length > pageSize && (
        <div className="flex gap-2 items-center mt-2">
          <button
            className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
