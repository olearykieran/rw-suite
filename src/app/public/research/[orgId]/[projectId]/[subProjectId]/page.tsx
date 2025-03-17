"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { ResearchEntry } from "@/lib/services/ResearchService";

// Reuse components from the original research page
function PreviewImage({ url }: { url: string }) {
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

function SummaryModal({ isOpen, title, summary, onClose }: { 
  isOpen: boolean;
  title: string;
  summary: string;
  onClose: () => void;
}) {
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button 
        onClick={onPrev} 
        disabled={currentPage === 1}
        className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
      <button 
        onClick={onNext} 
        disabled={currentPage === totalPages}
        className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export default function PublicResearchPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  
  const [researchEntries, setResearchEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const [viewMode, setViewMode] = useState<"table" | "card">("card");

  // Fetch research entries from the public API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/public/research?orgId=${orgId}&projectId=${projectId}&subProjectId=${subProjectId}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch research entries");
        }
        
        const data = await response.json();
        setResearchEntries(data.entries || []);
      } catch (err: any) {
        console.error("Error loading research entries:", err);
        setError("Failed to load research entries.");
      } finally {
        setLoading(false);
      }
    }
    
    if (orgId && projectId && subProjectId) {
      loadData();
    }
  }, [orgId, projectId, subProjectId]);

  // Utility to truncate long summaries
  const truncate = (text: string, maxLength: number): string =>
    text?.length > maxLength ? text.substring(0, maxLength) + "..." : text || "";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Research Materials
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Public access to research materials
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex space-x-4 mt-4 justify-center">
          <button
            onClick={() => toggleViewMode("table")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "table" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => toggleViewMode("card")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "card" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Card View
          </button>
        </div>

        {error && <p className="text-red-600 mt-2 text-center">{error}</p>}

        {loading ? (
          <div className="flex justify-center mt-8">
            <p>Loading research entries...</p>
          </div>
        ) : researchEntries.length === 0 ? (
          <p className="mt-4 text-center">No research entries found.</p>
        ) : (
          <>
            {viewMode === "table" ? (
              // Table View
              <div className="w-full mt-6">
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
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
                            className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700 transition-colors"
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
                                className="text-blue-600 dark:text-blue-400 underline"
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
                                {entry.summary?.length > 100 && (
                                  <button
                                    onClick={() => openModal(entry.title, entry.summary)}
                                    className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
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
                  </div>
                </div>
              </div>
            ) : (
              // Card View
              <div className="w-full mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedEntries.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition duration-200"
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
                          className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {entry.title}
                        </a>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Type:</span> {entry.type}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Source:</span> {entry.source}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Date:</span> {entry.date}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Tags:</span>{" "}
                          {Array.isArray(entry.tags) ? entry.tags.join(", ") : ""}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Summary:</span>{" "}
                          {truncate(entry.summary, 80)}
                          {entry.summary?.length > 80 && (
                            <button
                              onClick={() => openModal(entry.title, entry.summary)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Read More
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-semibold">Author:</span>{" "}
                          {entry.author || "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
              />
            )}
          </>
        )}

        <SummaryModal
          isOpen={isModalOpen}
          title={modalTitle}
          summary={modalSummary}
          onClose={closeModal}
        />
      </div>
    </div>
  );
}
