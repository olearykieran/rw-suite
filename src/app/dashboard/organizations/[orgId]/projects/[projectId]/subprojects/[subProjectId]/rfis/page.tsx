// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/rfis/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAllRfis } from "@/lib/services/RfiService";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
// Use our global loading bar hook from context.
import { useLoadingBar } from "@/context/LoadingBarContext";

/**
 * Interface representing a single RFI item.
 */
interface RfiItem {
  id: string;
  rfiNumber?: number;
  subject?: string;
  status?: string;
  importance?: string;
  assignedTo?: string;
}

/**
 * RfiListContent contains the actual page content for listing RFIs.
 */
function RfiListContent() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  const [rfis, setRfis] = useState<RfiItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // For filtering
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "open" | "inReview" | "resolved" | "closed"
  >("all");

  // For pagination
  const [pageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter the RFIs based on status.
  const filteredRfis = rfis.filter((rfi) => {
    if (filterStatus === "all") return true;
    if (!rfi.status) return false;
    return rfi.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // Calculate pagination values.
  const totalPages = Math.ceil(filteredRfis.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageData = filteredRfis.slice(startIndex, endIndex);

  // Load RFIs from Firestore.
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllRfis(orgId, projectId, subProjectId);

        // Sort by RFI number if available.
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
        setIsInitialLoading(false);
      }
    };
    loadData();
  }, [orgId, projectId, subProjectId]);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back button */}
      <div className="flex items-center justify-between">
        <GrayButton
          onClick={() => {
            setIsLoading(true); // Trigger the loading bar before navigating.
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            );
          }}
        >
          &larr; Back to Sub-Project
        </GrayButton>
      </div>

      {/* Title and Create RFI button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">RFIs</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/new`}
          onClick={() => setIsLoading(true)}
        >
          <GrayButton>Create New RFI</GrayButton>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mt-4">
        <h2 className="text-lg text-black dark:text-white font-semibold">Filter RFIs</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-black dark:text-white">
          <label htmlFor="statusFilter" className="font-medium">
            Filter by Status:
          </label>
          <select
            id="statusFilter"
            className="border p-2 rounded bg-white text-black dark:bg-neutral-800 dark:text-white transition-colors"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setCurrentPage(1); // Reset to first page on filter change.
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

      {/* List of RFIs */}
      <AnimatedList
        items={pageData}
        isLoading={isInitialLoading}
        className="mt-4"
        emptyMessage={
          <p className="text-neutral-700 dark:text-neutral-300">
            No RFIs match your filter.
          </p>
        }
        renderItem={(rfi) => (
          <>
            {/* Table view for desktop */}
            <div className="hidden sm:block text-black dark:text-white overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <table className="w-full min-w-[600px]">
                <thead className="border-b">
                  <tr>
                    <th className="p-3 text-left font-medium">RFI #</th>
                    <th className="p-3 text-left font-medium">Subject</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Importance</th>
                    <th className="p-3 text-left font-medium">Assigned To</th>
                    <th className="p-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <td className="p-3">{rfi.rfiNumber || "--"}</td>
                    <td className="p-3">{rfi.subject}</td>
                    <td className="p-3 capitalize">{rfi.status}</td>
                    <td className="p-3 capitalize">{rfi.importance}</td>
                    <td className="p-3">{rfi.assignedTo || "N/A"}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
                        onClick={() => setIsLoading(true)}
                        className="inline-block"
                      >
                        <GrayButton>View</GrayButton>
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Card view for mobile */}
            <div className="block sm:hidden">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-3 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">RFI #{rfi.rfiNumber || "--"}</h2>
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis/${rfi.id}`}
                    onClick={() => setIsLoading(true)}
                    className="inline-block"
                  >
                    <GrayButton>View</GrayButton>
                  </Link>
                </div>
                <p className="mt-1">
                  <strong>Subject:</strong> {rfi.subject}
                </p>
                <p>
                  <strong>Status:</strong> {rfi.status}
                </p>
                <p>
                  <strong>Importance:</strong> {rfi.importance}
                </p>
                <p>
                  <strong>Assigned To:</strong> {rfi.assignedTo || "N/A"}
                </p>
              </div>
            </div>
          </>
        )}
      />

      {/* Pagination Controls */}
      {filteredRfis.length > pageSize && (
        <div className="flex gap-2 items-center mt-4">
          <GrayButton
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </GrayButton>
          <span>
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

/**
 * RfiListPage is the exported component.
 * Since our LoadingBarContext is provided at a higher level in our DashboardLayout,
 * we do not need to wrap it again here.
 */
export default function RfiListPage() {
  return <RfiListContent />;
}
