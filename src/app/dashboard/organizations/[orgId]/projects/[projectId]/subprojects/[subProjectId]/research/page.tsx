"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { fetchResearchEntries } from "@/lib/services/ResearchService";
import { ResearchEntry } from "@/lib/services/ResearchService";
import { generatePublicResearchLink } from "@/lib/utils/publicLinks";

/**
 * PreviewImage component
 * Uses our API route to fetch a preview image URL and displays it.
 * Note: We have removed the "export" keyword here so that Next.js does not
 * treat it as a page export field.
 */
interface PreviewImageProps {
  url: string;
}

function PreviewImage({ url }: PreviewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getPreviewImage() {
      try {
        const res = await fetch(`/api/preview-image?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      } catch (err) {
        console.error("Error fetching preview image:", err);
      } finally {
        setLoading(false);
      }
    }
    getPreviewImage();
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Preview"
        className="w-full h-full object-cover"
        onError={() => setImageUrl(null)}
      />
    );
  }

  return <div className="w-full h-48 bg-gray-300 dark:bg-gray-600 rounded-t-lg" />;
}

/**
 * SummaryModal component
 * Displays the full summary of a research entry in a modal dialog.
 */
interface SummaryModalProps {
  isOpen: boolean;
  title: string;
  summary: string;
  onClose: () => void;
}

function SummaryModal({ isOpen, title, summary, onClose }: SummaryModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800 dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white dark:text-white"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-sm text-white dark:text-gray-300 whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <GrayButton onClick={onClose}>Close</GrayButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * PaginationControls component
 * Provides previous/next navigation for paginated research entries.
 */
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4">
      <GrayButton onClick={onPrev} disabled={currentPage === 1}>
        Prev
      </GrayButton>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
      <GrayButton onClick={onNext} disabled={currentPage === totalPages}>
        Next
      </GrayButton>
    </div>
  );
}

/**
 * ResearchListPage component
 * The main page component with toggle between Table and Card views.
 * The default view mode has been updated to "card".
 */
export default function ResearchListPage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();
  const [researchEntries, setResearchEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareSuccess, setShareSuccess] = useState(false);

  // Modal state for full summary
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSummary, setModalSummary] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(researchEntries.length / pageSize);
  const paginatedEntries = researchEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // View mode state: "table" or "card"
  // Updated default view mode to "card"
  const [viewMode, setViewMode] = useState<"table" | "card">("card");

  console.log("Research page rendering", {
    user,
    authLoading,
    orgId,
    projectId,
    subProjectId,
  });

  // Fetch research entries on mount or when route parameters change
  useEffect(() => {
    async function loadData() {
      try {
        console.log("Loading research data", { user, orgId, projectId, subProjectId });
        setLoading(true);

        // Use the public API if user is not authenticated
        if (!user) {
          console.log("Using public API to fetch research");
          try {
            const response = await fetch(
              `/api/public/research?orgId=${orgId}&projectId=${projectId}&subProjectId=${subProjectId}`
            );

            if (!response.ok) {
              console.error(
                "Public API response not OK",
                response.status,
                response.statusText
              );
              const errorText = await response.text();
              console.error("Error response:", errorText);
              throw new Error(
                `Failed to fetch research entries: ${response.status} ${response.statusText}`
              );
            }

            const data = await response.json();
            console.log("Public API response", data);
            setResearchEntries(data.entries || []);
          } catch (fetchError) {
            console.error("Fetch error:", fetchError);
            setError("Failed to load research entries. Please try again later.");
          }
        } else {
          // Use the authenticated service if user is logged in
          console.log("Using authenticated service to fetch research");
          try {
            const entries = await fetchResearchEntries(orgId, projectId, subProjectId);
            console.log("Authenticated service response", entries);
            setResearchEntries(entries);
          } catch (fetchError) {
            console.error("Authenticated fetch error:", fetchError);
            setError("Failed to load research entries. Please try again later.");
          }
        }
      } catch (err: any) {
        console.error("Error loading research entries:", err);
        setError("Failed to load research entries.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId, projectId, subProjectId, user]);

  // Utility to truncate long summaries
  const truncate = (text: string, maxLength: number): string =>
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  // Handlers for modal operations
  const openModal = (title: string, summary: string) => {
    setModalTitle(title);
    setModalSummary(summary);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handlers for pagination
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Handler for toggling view mode
  const toggleViewMode = (mode: "table" | "card") => {
    setViewMode(mode);
    setCurrentPage(1); // Reset pagination when switching views
  };

  // Handler for sharing the research page
  const handleShareResearch = () => {
    const publicLink = generatePublicResearchLink(orgId, projectId, subProjectId);
    navigator.clipboard.writeText(publicLink).then(
      () => {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <PageContainer className="max-w-full">
      {/* Only show navigation buttons for authenticated users */}
      {user && (
        <div className="flex items-center justify-between">
          <GrayButton onClick={() => router.back()}>&larr; Back</GrayButton>
          <div className="flex space-x-2">
            <GrayButton onClick={handleShareResearch}>
              {shareSuccess ? "✓ Link Copied!" : "Share Research"}
            </GrayButton>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/research/new`}
            >
              <GrayButton>Add Research Entry</GrayButton>
            </Link>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mt-4">Research Sources</h1>

      {/* View mode toggle */}
      <div className="flex space-x-4 mt-4">
        <GrayButton
          onClick={() => toggleViewMode("table")}
          className={viewMode === "table" ? "bg-blue-600 text-white" : ""}
        >
          Table View
        </GrayButton>
        <GrayButton
          onClick={() => toggleViewMode("card")}
          className={viewMode === "card" ? "bg-blue-600 text-white" : ""}
        >
          Card View
        </GrayButton>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {loading ? (
        <p>Loading research entries...</p>
      ) : researchEntries.length === 0 ? (
        <p className="mt-4">No research entries found. Add one using the button above.</p>
      ) : (
        <>
          {viewMode === "table" ? (
            // Table View
            <div className="w-full">
              <Card className="mt-4 p-4 overflow-x-auto w-full max-w-none shadow-lg rounded-lg">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-900 dark:bg-gray-800">
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Image
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Title
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Source
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Tags
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Summary
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Author
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEntries.map((entry, index) => (
                      <tr
                        key={index}
                        className="odd:bg-gray-900 even:bg-gray-50 dark:odd:bg-gray-700 dark:even:bg-gray-600 transition-colors"
                      >
                        <td className="p-4 border-b">
                          {entry.image ? (
                            <img
                              src={entry.image}
                              alt={`${entry.title} preview`}
                              className="w-24 h-24 object-cover rounded"
                            />
                          ) : (
                            <PreviewImage url={entry.url} />
                          )}
                        </td>
                        <td className="p-4 border-b">
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white dark:text-gray-400 underline"
                          >
                            {entry.title}
                          </a>
                        </td>
                        <td className="p-4 border-b">{entry.type}</td>
                        <td className="p-4 border-b">{entry.source}</td>
                        <td className="p-4 border-b">{entry.date}</td>
                        <td className="p-4 border-b">
                          {Array.isArray(entry.tags) ? entry.tags.join(", ") : ""}
                        </td>
                        <td className="p-4 border-b">
                          <div className="flex items-center">
                            <span>{truncate(entry.summary, 100)}</span>
                            {entry.summary.length > 100 && (
                              <button
                                onClick={() => openModal(entry.title, entry.summary)}
                                className="ml-2 text-sm text-white dark:text-gray-400 hover:underline whitespace-nowrap"
                              >
                                Read More
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-b">{entry.author || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ) : (
            // Card View
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                {paginatedEntries.map((entry, index) => (
                  <Card
                    key={index}
                    className="shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition duration-200"
                  >
                    {/* Image Section */}
                    <div className="w-full h-48 overflow-hidden">
                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt={`${entry.title} preview`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PreviewImage url={entry.url} />
                      )}
                    </div>
                    {/* Content Section */}
                    <div className="p-4 flex flex-col space-y-2">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl font-bold text-white dark:text-gray-400 hover:underline"
                      >
                        {entry.title}
                      </a>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Type:</span> {entry.type}
                      </div>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Source:</span> {entry.source}
                      </div>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Date:</span> {entry.date}
                      </div>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Tags:</span>{" "}
                        {Array.isArray(entry.tags) ? entry.tags.join(", ") : ""}
                      </div>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Summary:</span>{" "}
                        {truncate(entry.summary, 80)}
                        {entry.summary.length > 80 && (
                          <button
                            onClick={() => openModal(entry.title, entry.summary)}
                            className="ml-1 text-white dark:text-blue-400 hover:underline"
                          >
                            Read More
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-white dark:text-gray-300">
                        <span className="font-semibold">Author:</span>{" "}
                        {entry.author || "N/A"}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </>
      )}

      <SummaryModal
        isOpen={isModalOpen}
        title={modalTitle}
        summary={modalSummary}
        onClose={closeModal}
      />
    </PageContainer>
  );
}
