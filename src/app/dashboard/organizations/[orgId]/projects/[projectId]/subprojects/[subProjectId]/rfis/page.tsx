// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAllRfis } from "@/lib/services/RfiService";

interface RfiItem {
  id: string;
  rfiNumber?: number;
  subject?: string;
  status?: string;
  importance?: string;
  assignedTo?: string;
}

export default function RfiListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [rfis, setRfis] = useState<RfiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For filtering
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "open" | "inReview" | "resolved" | "closed"
  >("all");

  // For pagination
  const [pageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Derived data after filtering
  const filteredRfis = rfis.filter((rfi) => {
    if (filterStatus === "all") return true;
    if (!rfi.status) return false;
    return rfi.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRfis.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = filteredRfis.slice(startIndex, endIndex);

  // Load RFIs from Firestore
  useEffect(() => {
    (async () => {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllRfis(orgId, projectId, subProjectId);
        // Sort them by createdAt or rfiNumber
        const sorted = data.sort((a: any, b: any) => {
          if (a.rfiNumber && b.rfiNumber) {
            return a.rfiNumber - b.rfiNumber;
          }
          return 0;
        });
        setRfis(sorted as RfiItem[]);
      } catch (err: any) {
        console.error("Fetch RFIs error:", err);
        setError("Failed to load RFIs.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, projectId, subProjectId]);

  if (loading) return <div className="p-4">Loading RFIs...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Project
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold">RFIs</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create New RFI
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <label htmlFor="statusFilter" className="font-medium">
          Filter by Status:
        </label>
        <select
          id="statusFilter"
          className="border p-2"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as any);
            setCurrentPage(1); // reset to first page
          }}
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="inReview">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* No results */}
      {filteredRfis.length === 0 && (
        <p className="text-gray-700">No RFIs match your filter.</p>
      )}

      {filteredRfis.length > 0 && (
        <>
          {/* Table for >= sm screens */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border min-w-[600px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-2 text-left">RFI #</th>
                  <th className="p-2 text-left">Subject</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Importance</th>
                  <th className="p-2 text-left">Assigned To</th>
                  <th className="p-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((rfi) => (
                  <tr key={rfi.id} className="border-b">
                    <td className="p-2">{rfi.rfiNumber || "--"}</td>
                    <td className="p-2">{rfi.subject}</td>
                    <td className="p-2 capitalize">{rfi.status}</td>
                    <td className="p-2 capitalize">{rfi.importance}</td>
                    <td className="p-2">{rfi.assignedTo || "N/A"}</td>
                    <td className="p-2">
                      <Link
                        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
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

          {/* Card View for < sm screens */}
          <div className="block sm:hidden space-y-3">
            {pageData.map((rfi) => (
              <div
                key={rfi.id}
                className="border rounded p-3 bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">RFI #{rfi.rfiNumber || "--"}</h2>
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
                    className="text-blue-600 underline text-sm"
                  >
                    View
                  </Link>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Subject:</strong> {rfi.subject}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Status:</strong> {rfi.status}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Importance:</strong> {rfi.importance}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Assigned To:</strong> {rfi.assignedTo || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {filteredRfis.length > pageSize && (
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
