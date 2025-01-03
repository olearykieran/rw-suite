// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/rfis/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAllRfis } from "@/lib/services/RfiService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

        // Sort by RFI number or created date
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

  if (loading) {
    return <div className="p-6 text-sm">Loading RFIs...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Title + Create RFI button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold">RFIs</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/new`}
        >
          <GrayButton>Create New RFI</GrayButton>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <h2 className="text-lg font-semibold">Filter RFIs</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label htmlFor="statusFilter" className="font-medium">
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
      </Card>

      {/* No results */}
      {filteredRfis.length === 0 && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          No RFIs match your filter.
        </p>
      )}

      {/* If there are RFIs, show the table & cards */}
      {filteredRfis.length > 0 && (
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
            <table className="w-full min-w-[600px]">
              <thead className="border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">RFI #</th>
                  <th className="p-3 text-left text-sm font-medium">Subject</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Importance</th>
                  <th className="p-3 text-left text-sm font-medium">Assigned To</th>
                  <th className="p-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((rfi) => (
                  <tr
                    key={rfi.id}
                    className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <td className="p-3">{rfi.rfiNumber || "--"}</td>
                    <td className="p-3">{rfi.subject}</td>
                    <td className="p-3 capitalize">{rfi.status}</td>
                    <td className="p-3 capitalize">{rfi.importance}</td>
                    <td className="p-3">{rfi.assignedTo || "N/A"}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
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
            {pageData.map((rfi) => (
              <div
                key={rfi.id}
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-800
                  rounded p-3 shadow-sm hover:shadow-md
                  transition
                "
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">RFI #{rfi.rfiNumber || "--"}</h2>
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
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
                  <strong>Subject:</strong> {rfi.subject}
                </p>
                <p className="text-sm">
                  <strong>Status:</strong> {rfi.status}
                </p>
                <p className="text-sm">
                  <strong>Importance:</strong> {rfi.importance}
                </p>
                <p className="text-sm">
                  <strong>Assigned To:</strong> {rfi.assignedTo || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {filteredRfis.length > pageSize && (
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
