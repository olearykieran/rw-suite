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
    return <div className="w-full h-48 animate-pulse bg-gray-700 rounded-t-lg" />;
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

  return <div className="w-full h-48 bg-gray-800 rounded-t-lg" />;
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{summary}</p>
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
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Modal state for full summary
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSummary, setModalSummary] = useState("");

  // Updated default view mode to "card"
  const [viewMode, setViewMode] = useState<"table" | "card" | "social">("card");

  const [socialFilter, setSocialFilter] = useState<string | null>(null);

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
            const sortedEntries = sortEntriesByDate(data.entries || []);
            setResearchEntries(sortedEntries);
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
            const sortedEntries = sortEntriesByDate(entries);
            setResearchEntries(sortedEntries);
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

  // Function to sort entries by date (newest first)
  const sortEntriesByDate = (entries: ResearchEntry[]) => {
    return [...entries].sort((a, b) => {
      // Convert dates to timestamps for comparison
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;

      // Sort in descending order (newest first)
      return dateB - dateA;
    });
  };

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
          onClick={() => setViewMode("table")}
          className={
            viewMode === "table"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 hover:bg-gray-600"
          }
        >
          Table View
        </GrayButton>
        <GrayButton
          onClick={() => setViewMode("card")}
          className={
            viewMode === "card"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 hover:bg-gray-600"
          }
        >
          Card View
        </GrayButton>
        <GrayButton
          onClick={() => setViewMode("social")}
          className={
            viewMode === "social"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 hover:bg-gray-600"
          }
        >
          Social Media
        </GrayButton>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : researchEntries.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400">No research entries found.</p>
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            // Table View
            <div className="w-full">
              <Card className="mt-4 p-4 overflow-x-auto w-full max-w-none shadow-lg rounded-lg">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white">
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
                        Summary
                      </th>
                      <th className="p-4 border-b text-left uppercase tracking-wider whitespace-nowrap">
                        Author
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {researchEntries
                      .filter(
                        (entry) => entry.type !== "twitter" && entry.type !== "instagram"
                      )
                      .map((entry, index) => (
                        <tr
                          key={index}
                          className="odd:bg-gray-700 even:bg-gray-600 transition-colors"
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
                              className="text-gray-400 underline"
                            >
                              {entry.title}
                            </a>
                          </td>
                          <td className="p-4 border-b">{entry.type}</td>
                          <td className="p-4 border-b">{entry.source}</td>
                          <td className="p-4 border-b">{entry.date}</td>
                          <td className="p-4 border-b">
                            <div className="flex items-center">
                              <span>{truncate(entry.summary, 100)}</span>
                              {entry.summary.length > 100 && (
                                <button
                                  onClick={() => openModal(entry.title, entry.summary)}
                                  className="ml-2 text-sm text-gray-400 hover:underline whitespace-nowrap"
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
          ) : viewMode === "card" ? (
            // Card View
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                {researchEntries
                  .filter(
                    (entry) => entry.type !== "twitter" && entry.type !== "instagram"
                  )
                  .map((entry, index) => (
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
                          className="text-xl font-bold text-gray-400 hover:underline"
                        >
                          {entry.title}
                        </a>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Type:</span> {entry.type}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Source:</span> {entry.source}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Date:</span> {entry.date}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Tags:</span>{" "}
                          {Array.isArray(entry.tags) ? entry.tags.join(", ") : ""}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Summary:</span>{" "}
                          {truncate(entry.summary, 80)}
                          {entry.summary.length > 80 && (
                            <button
                              onClick={() => openModal(entry.title, entry.summary)}
                              className="ml-1 text-blue-400 hover:underline"
                            >
                              Read More
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">Author:</span>{" "}
                          {entry.author || "N/A"}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ) : (
            // Social Media View
            <div className="w-full">
              {/* Filter buttons for social platforms */}
              <div className="flex space-x-4 mt-4 mb-6">
                <button
                  className={`px-4 py-2 rounded-full transition-colors ${
                    !socialFilter
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={() => setSocialFilter(null)}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 rounded-full transition-colors flex items-center ${
                    socialFilter === "twitter"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={() => setSocialFilter("twitter")}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X (Twitter)
                </button>
                <button
                  className={`px-4 py-2 rounded-full transition-colors flex items-center ${
                    socialFilter === "instagram"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={() => setSocialFilter("instagram")}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {/* Filter social media entries */}
                {researchEntries
                  .filter(
                    (entry) =>
                      (entry.type === "twitter" || entry.type === "instagram") &&
                      (!socialFilter || entry.type === socialFilter)
                  )
                  .map((entry, index) => (
                    <Card
                      key={index}
                      className="shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition duration-200"
                    >
                      {entry.type === "twitter" ? (
                        // Twitter/X Post Card
                        <div className="p-4 flex flex-col space-y-3">
                          {/* Header with profile info */}
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                              {entry.image ? (
                                <img
                                  src={entry.image}
                                  alt={`${entry.author} profile`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-400 flex items-center justify-center text-white text-xl font-bold">
                                  {entry.author?.charAt(0) || "X"}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-gray-200">
                                {entry.author}
                              </div>
                              <div className="text-sm text-gray-500">@{entry.source}</div>
                            </div>
                            <div className="ml-auto">
                              <svg
                                className="w-6 h-6 text-blue-400"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </div>
                          </div>

                          {/* Tweet content */}
                          <div className="text-gray-300">{entry.summary}</div>

                          {/* Media if available */}
                          {entry.image && (
                            <div className="rounded-lg overflow-hidden mt-2">
                              <img
                                src={entry.image}
                                alt="Tweet media"
                                className="w-full object-cover"
                              />
                            </div>
                          )}

                          {/* Date and metrics */}
                          <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-700">
                            <div>{entry.date}</div>
                            <div className="flex space-x-4">
                              <span className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                {entry.comments || 0}
                              </span>
                              <span className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                {entry.shares || 0}
                              </span>
                              <span className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                                {entry.likes || 0}
                              </span>
                            </div>
                          </div>

                          {/* Link to original */}
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm mt-2 inline-block"
                          >
                            View on X
                          </a>
                        </div>
                      ) : entry.type === "instagram" ? (
                        // Instagram Post Card
                        <div>
                          {/* Header with profile info */}
                          <div className="p-4 flex items-center space-x-3 border-b border-gray-700">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500">
                              {entry.image ? (
                                <img
                                  src={entry.image}
                                  alt={`${entry.author} profile`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-yellow-400 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                                  {entry.author?.charAt(0) || "I"}
                                </div>
                              )}
                            </div>
                            <div className="font-semibold text-gray-200">
                              {entry.author}
                            </div>
                          </div>

                          {/* Image - Instagram posts always have an image */}
                          <div className="aspect-square overflow-hidden">
                            {entry.image ? (
                              <img
                                src={entry.image}
                                alt={entry.title || "Instagram post"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
                                <svg
                                  className="w-16 h-16"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="p-4 flex space-x-4 text-gray-300">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                          </div>

                          {/* Likes */}
                          <div className="px-4 font-semibold text-gray-200">
                            {entry.likes || 0} likes
                          </div>

                          {/* Caption */}
                          <div className="p-4 text-gray-300">
                            <span className="font-semibold">{entry.author}</span>{" "}
                            {entry.summary}
                            {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                              <div className="mt-1 text-blue-400">
                                {entry.tags.map((tag) => `#${tag}`).join(" ")}
                              </div>
                            )}
                          </div>

                          {/* Date */}
                          <div className="px-4 pb-4 text-xs text-gray-500 uppercase">
                            {entry.date}
                          </div>

                          {/* Link to original */}
                          <div className="p-4 border-t border-gray-700">
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-sm"
                            >
                              View on Instagram
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Fallback for other social media types
                        <div className="p-4">
                          <div className="font-bold text-lg text-gray-200 mb-2">
                            {entry.title}
                          </div>
                          <div className="text-gray-300 mb-4">{entry.summary}</div>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            View original post
                          </a>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>

              {/* Show message if no social media posts */}
              {researchEntries.filter(
                (entry) => entry.type === "twitter" || entry.type === "instagram"
              ).length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-400">
                    No social media posts found. Add some using the Research form!
                  </p>
                </div>
              )}
            </div>
          )}
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
