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
  entryImage?: string;
}

function PreviewImage({ url, entryImage }: PreviewImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function getPreviewImage() {
      try {
        setLoading(true);
        setError(false);

        // If we already have an entryImage, use it directly
        if (entryImage) {
          setImageUrl(entryImage);
          setLoading(false);
          return;
        }

        // Special handling for Instagram URLs
        if (url.includes("instagram.com")) {
          try {
            // Extract the post ID from the URL
            const regex = /instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/;
            const match = url.match(regex);

            if (match && match[2]) {
              const postId = match[2];

              try {
                // Use our Instagram embed proxy API
                const proxyUrl = `/api/instagram-embed?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);

                if (res.ok) {
                  const data = await res.json();
                  if (data.thumbnail_url) {
                    // The thumbnail_url is now a proxy URL that will avoid CORS issues
                    setImageUrl(data.thumbnail_url);
                    setLoading(false);
                    return;
                  }
                }
              } catch (proxyError) {
                console.error("Error using Instagram proxy:", proxyError);
              }

              // Fallback to using our proxy directly if the API call fails
              const directUrl = `/api/instagram-embed?proxyImage=${encodeURIComponent(
                `https://instagram.com/p/${postId}/media/?size=l`
              )}`;
              setImageUrl(directUrl);
              setLoading(false);
              return;
            }
          } catch (instagramError) {
            console.error("Error extracting Instagram image:", instagramError);
          }
        }

        // For other URLs, try to fetch a preview
        const res = await fetch(`/api/preview-image?url=${encodeURIComponent(url)}`);

        if (!res.ok) {
          // If the API returns an error, try to extract domain for a fallback image
          try {
            const domain = new URL(url).hostname;
            // Use favicon as fallback
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

            // Test if favicon is available
            const img = new Image();
            img.onload = () => {
              setImageUrl(faviconUrl);
              setLoading(false);
            };
            img.onerror = () => {
              setError(true);
              setLoading(false);
            };
            img.src = faviconUrl;
            return;
          } catch (e) {
            // If favicon approach fails, set error state
            console.error("Error creating fallback image:", e);
            setError(true);
            setImageUrl(null);
            setLoading(false);
            return;
          }
        }

        const data = await res.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching preview image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    getPreviewImage();
  }, [url, entryImage]);

  if (loading) {
    return <div className="w-full h-48 animate-pulse bg-gray-700 rounded-t-lg" />;
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Preview"
        className="w-full h-full object-cover"
        onError={() => {
          setImageUrl(null);
          setError(true);
        }}
      />
    );
  }

  // Fallback for when no image is found or there was an error
  return (
    <div className="w-full h-48 bg-gray-800 rounded-t-lg flex items-center justify-center">
      {error ? (
        <div className="text-gray-500 text-center p-4">
          <svg
            className="w-10 h-10 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>Image unavailable</p>
        </div>
      ) : (
        <div className="text-gray-500 text-center p-4">
          <svg
            className="w-10 h-10 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>No preview available</p>
        </div>
      )}
    </div>
  );
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

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Function to sort social media entries by platform (Twitter first, then Instagram)
  const sortSocialMediaEntries = (entries: ResearchEntry[]) => {
    return [...entries].sort((a, b) => {
      // First sort by platform type (Twitter first, then Instagram)
      if (a.type === "twitter" && b.type !== "twitter") return -1;
      if (a.type !== "twitter" && b.type === "twitter") return 1;

      // If both are the same type, sort by date (newest first)
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
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

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Check for theme preference on mount
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      // Default to dark mode if no preference or if preference is "dark"
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      if (!theme) {
        localStorage.setItem("theme", "dark");
      }
    }
  }, []);

  return (
    <PageContainer className="max-w-full">
      {/* Header with theme toggle */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Deep Research</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          {user && (
            <button
              onClick={handleShareResearch}
              className="flex items-center px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

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

      <h1 className="text-2xl font-bold mt-4">Wellness Market</h1>

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
                              <PreviewImage url={entry.url} entryImage={entry.image} />
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
                          <PreviewImage url={entry.url} entryImage={entry.image} />
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
                    {/* Simplified Instagram icon to avoid path errors */}
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.228-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.148-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  Instagram
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {/* Filter and sort social media entries */}
                {sortSocialMediaEntries(researchEntries)
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
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                                />
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
                              <PreviewImage url={entry.url} entryImage={entry.image} />
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
