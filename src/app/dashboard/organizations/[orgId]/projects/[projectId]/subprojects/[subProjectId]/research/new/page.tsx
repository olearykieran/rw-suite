// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/research/new/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { createResearchEntries, ResearchEntry } from "@/lib/services/ResearchService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { toast } from "react-hot-toast";
import { PreviewImage } from "@/components/PreviewImage";

// Add URL preview interface
interface UrlPreview {
  title?: string;
  description?: string;
  image?: string;
  author?: string;
}

/**
 * NewResearchPage allows users to add research entries in two ways:
 * 1. By pasting a JSON array of research entries
 * 2. By filling out a form for a single entry, including social media posts
 *
 * Each research entry should include:
 *  - title: string
 *  - url: string
 *  - type: string (e.g., "Article", "Website", "twitter", "instagram", etc.)
 *  - source: string (e.g., "NY Times", "Instagram", username for social media)
 *  - date: string (ISO date format)
 *  - tags: string[] (an array of tags)
 *  - summary: string
 *
 * Optionally, you can also include:
 *  - author: string (the article's author or social media account name)
 *  - image: string (URL to an image, especially for social media posts)
 *  - notes: string (your personal notes or commentary)
 *  - likes: number (for social media posts)
 *  - shares: number (for social media posts)
 *  - comments: number (for social media posts)
 */
export default function NewResearchPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const [user] = useAuthState(auth);
  const router = useRouter();

  // State for the JSON input method
  const [jsonInput, setJsonInput] = useState<string>("");

  // State for the form input method
  const [formEntry, setFormEntry] = useState<Partial<ResearchEntry>>({
    title: "",
    url: "",
    type: "Article",
    source: "",
    date: new Date().toISOString().split("T")[0],
    tags: [],
    summary: "",
    author: "",
    image: "",
  });

  // State for tag input
  const [tagInput, setTagInput] = useState("");

  // Input method toggle
  const [inputMethod, setInputMethod] = useState<"json" | "form">("form");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add URL preview state
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState<UrlPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  /**
   * Handles the JSON form submission by parsing the JSON and saving each research entry.
   */
  async function handleJsonSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Clean the JSON input to handle potential formatting issues
      const cleanedInput = jsonInput
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces and other invisible characters
        .replace(/\n\s*\n/g, "\n") // Remove extra blank lines
        .replace(/,\s*]/g, "]") // Remove trailing commas
        .replace(/^\s*\[?\s*{/, "[{") // Ensure it starts with [{
        .replace(/}\s*\]?\s*$/, "}]"); // Ensure it ends with }]

      console.log("Cleaned JSON input:", cleanedInput);

      // Parse the JSON input
      let parsedInput;
      try {
        parsedInput = JSON.parse(cleanedInput);
      } catch (e) {
        const parseError = e as Error;
        console.error("JSON Parse Error:", parseError);
        console.log("Attempted to parse:", cleanedInput);

        // Try one more approach - manually wrap in array if needed
        try {
          // If it starts with { and ends with }, wrap it in []
          if (cleanedInput.trim().startsWith("{") && cleanedInput.trim().endsWith("}")) {
            const wrappedInput = `[${cleanedInput}]`;
            console.log("Trying with wrapped input:", wrappedInput);
            parsedInput = JSON.parse(wrappedInput);
          } else {
            throw parseError;
          }
        } catch (e) {
          throw new Error(
            `Invalid JSON format: ${parseError.message}. Please check your input.`
          );
        }
      }

      // Handle both single objects and arrays
      const entries: ResearchEntry[] = Array.isArray(parsedInput)
        ? parsedInput
        : [parsedInput];

      // Validate that each entry has the required fields.
      for (const entry of entries) {
        if (
          !entry.title ||
          !entry.url ||
          !entry.type ||
          !entry.source ||
          !entry.date ||
          !entry.tags ||
          !entry.summary
        ) {
          throw new Error(
            "Each entry must include title, url, type, source, date, tags, and summary."
          );
        }
      }

      // Save the research entries to Firestore
      await createResearchEntries(orgId, projectId, subProjectId, entries);

      // Redirect to the research entries list page
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/research`
      );
    } catch (err: any) {
      console.error("Error creating research entries:", err);
      setError(err.message || "An error occurred while saving research entries.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles the form submission for a single entry
   */
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (
        !formEntry.title ||
        !formEntry.url ||
        !formEntry.type ||
        !formEntry.source ||
        !formEntry.date ||
        !formEntry.tags ||
        formEntry.tags.length === 0 ||
        !formEntry.summary
      ) {
        throw new Error(
          "Please fill in all required fields: title, url, type, source, date, tags, and summary."
        );
      }

      // Create a single entry
      const entry = { ...formEntry } as ResearchEntry;

      // Save the research entry to Firestore
      await createResearchEntries(orgId, projectId, subProjectId, [entry]);

      // Redirect to the research entries list page
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/research`
      );
    } catch (err: any) {
      console.error("Error creating research entry:", err);
      setError(err.message || "An error occurred while saving the research entry.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles adding a tag to the form entry
   */
  const handleAddTag = () => {
    if (tagInput.trim() && !formEntry.tags?.includes(tagInput.trim())) {
      setFormEntry({
        ...formEntry,
        tags: [...(formEntry.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  /**
   * Handles removing a tag from the form entry
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setFormEntry({
      ...formEntry,
      tags: formEntry.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  /**
   * Updates form fields based on the selected type
   */
  const handleTypeChange = (type: string) => {
    setFormEntry({
      ...formEntry,
      type,
      // Set default values based on type
      ...(type === "twitter" && { source: "" }),
      ...(type === "instagram" && { source: "" }),
    });
  };

  // Add function to fetch URL preview
  const fetchUrlPreview = async (url: string) => {
    if (!url || url.trim() === "") {
      setUrlPreview(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");

    try {
      // Create a serverless function endpoint for URL preview
      const response = await fetch("/api/url-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch URL preview");
      }

      const data = await response.json();
      setUrlPreview(data);

      // Auto-fill form fields if they're empty
      if (data) {
        const updatedEntry = { ...formEntry };

        // Only update fields if they're empty
        if (!formEntry.title && data.title) {
          updatedEntry.title = data.title;
        }

        if (!formEntry.image && data.image) {
          updatedEntry.image = data.image;
        }

        if (!formEntry.author && data.author) {
          updatedEntry.author = data.author;
        }

        if (!formEntry.summary && data.description) {
          updatedEntry.summary = data.description;
        }

        setFormEntry(updatedEntry);
      }
    } catch (error) {
      console.error("Error fetching URL preview:", error);
      setPreviewError("Failed to fetch preview for this URL");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add effect to fetch preview when URL changes
  useEffect(() => {
    // Debounce the URL preview fetch
    const handler = setTimeout(() => {
      if (formEntry.url) {
        fetchUrlPreview(formEntry.url);
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [formEntry.url]);

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Research Sources</h1>
        <GrayButton onClick={() => router.back()}>Cancel</GrayButton>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex space-x-4 mt-6">
        <button
          className={`px-4 py-2 rounded-md ${
            inputMethod === "form"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
          }`}
          onClick={() => setInputMethod("form")}
        >
          Form Input
        </button>
        <button
          className={`px-4 py-2 rounded-md ${
            inputMethod === "json"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
          }`}
          onClick={() => setInputMethod("json")}
        >
          JSON Input
        </button>
      </div>

      {inputMethod === "json" ? (
        <Card className="mt-4 p-4">
          <form onSubmit={handleJsonSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">
                Paste JSON Array of Research Sources
              </label>
              <textarea
                className="border p-2 w-full rounded bg-white text-black"
                rows={10}
                placeholder={`[
  {
    "title": "Bathhouse NYC Market Analysis",
    "url": "https://www.nytimes.com/2023/02/05/style/bathhouse-nyc.html",
    "type": "Article",
    "source": "NY Times",
    "date": "2023-02-05",
    "tags": ["Market Growth", "NYC"],
    "summary": "An in-depth analysis of Bathhouse NYC's market potential.",
    "author": "John Doe",
    "notes": "Key insights for urban wellness trends."
  },
  {
    "title": "Othership Social Media Buzz",
    "url": "https://www.othership.com/",
    "type": "Website",
    "source": "Othership",
    "date": "2024-01-05",
    "tags": ["Social Media", "Engagement"],
    "summary": "Data on Othership's growing social media presence.",
    "notes": "Useful for competitor analysis."
  }
]`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end space-x-2 mt-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md"
                onClick={() => {
                  // Set a working example
                  const example = [
                    {
                      title: "Sauna culture in NYC is exploding. Went to @othership_us…",
                      url: "https://x.com/c_gro/status/1893710132816560311",
                      type: "twitter",
                      source: "c_gro",
                      author: "Connor Gross",
                      date: "2025-02-24",
                      tags: ["Sauna", "NYC", "Wellness", "Health"],
                      summary:
                        "Sauna culture in NYC is exploding. Went to @othership_us yesterday and it was a packed house. Friends in their 20's choosing a 75-minute sauna session over a night out.",
                      image: "",
                      likes: 123,
                      shares: 45,
                      comments: 67,
                    },
                  ];
                  setJsonInput(JSON.stringify(example, null, 2));
                  setError(""); // Clear any previous errors
                }}
              >
                Use Example
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md"
                onClick={() => {
                  try {
                    // Clean the input
                    const cleanedInput = jsonInput
                      .trim()
                      .replace(/[\u200B-\u200D\uFEFF]/g, "")
                      .replace(/\n\s*\n/g, "\n")
                      .replace(/,\s*]/g, "]")
                      .replace(/^\s*\[?\s*{/, "[{") // Ensure it starts with [{
                      .replace(/}\s*\]?\s*$/, "}]"); // Ensure it ends with }]

                    // Try to parse
                    let parsed;
                    try {
                      parsed = JSON.parse(cleanedInput);
                    } catch (e) {
                      // Try one more approach - manually wrap in array if needed
                      if (
                        cleanedInput.trim().startsWith("{") &&
                        cleanedInput.trim().endsWith("}")
                      ) {
                        const wrappedInput = `[${cleanedInput}]`;
                        parsed = JSON.parse(wrappedInput);
                      } else {
                        throw e;
                      }
                    }

                    // Ensure it's an array
                    if (!Array.isArray(parsed)) {
                      parsed = [parsed];
                    }

                    // Format and update
                    const formatted = JSON.stringify(parsed, null, 2);
                    setJsonInput(formatted);
                    setError(""); // Clear any previous errors
                  } catch (e) {
                    const error = e as Error;
                    setError(
                      `Could not format JSON: ${error.message}. Try using the example instead.`
                    );
                  }
                }}
              >
                Format JSON
              </button>
            </div>

            <GrayButton type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Research Sources"}
            </GrayButton>
          </form>
        </Card>
      ) : (
        <Card className="mt-4 p-4">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type Selection */}
              <div className="md:col-span-2">
                <label className="block font-medium mb-2">Type of Entry</label>
                <div className="flex flex-wrap gap-3">
                  {["Article", "Website", "Video", "twitter", "instagram", "Other"].map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        className={`px-4 py-2 rounded-full ${
                          formEntry.type === type
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                        }`}
                        onClick={() => handleTypeChange(type)}
                      >
                        {type === "twitter" ? (
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            X (Twitter)
                          </span>
                        ) : type === "instagram" ? (
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.267-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.438-.645 1.438-1.44s-.643-1.44-1.438-1.44z" />
                            </svg>
                            Instagram
                          </span>
                        ) : (
                          type
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-medium mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="border p-2 w-full rounded bg-white text-black"
                  placeholder={
                    formEntry.type === "twitter"
                      ? "Tweet content preview"
                      : formEntry.type === "instagram"
                      ? "Instagram post title"
                      : "Title of the article, video, etc."
                  }
                  value={formEntry.title || ""}
                  onChange={(e) => setFormEntry({ ...formEntry, title: e.target.value })}
                  required
                />
              </div>

              {/* URL */}
              <div>
                <label className="block font-medium mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  className="border p-2 w-full rounded bg-white text-black"
                  placeholder={
                    formEntry.type === "twitter"
                      ? "https://x.com/username/status/123456789"
                      : formEntry.type === "instagram"
                      ? "https://www.instagram.com/p/abc123/"
                      : "https://example.com"
                  }
                  value={formEntry.url}
                  onChange={(e) => setFormEntry({ ...formEntry, url: e.target.value })}
                  required
                />
                {previewLoading && (
                  <div className="mt-2 text-sm text-gray-500">Loading preview...</div>
                )}
                {previewError && (
                  <div className="mt-2 text-sm text-red-500">{previewError}</div>
                )}
                {urlPreview && urlPreview.image && (
                  <div className="mt-2 border rounded p-2 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-start space-x-3">
                      <div className="w-20 h-20 flex-shrink-0">
                        <img
                          src={urlPreview.image}
                          alt="Preview"
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        {urlPreview.title && (
                          <div className="font-medium">{urlPreview.title}</div>
                        )}
                        {urlPreview.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {urlPreview.description}
                          </div>
                        )}
                        <button
                          type="button"
                          className="mt-1 text-xs text-blue-600 dark:text-blue-400"
                          onClick={() => {
                            // Auto-fill form with preview data
                            const updatedEntry = { ...formEntry };
                            if (urlPreview.title) updatedEntry.title = urlPreview.title;
                            if (urlPreview.description)
                              updatedEntry.summary = urlPreview.description;
                            if (urlPreview.image) updatedEntry.image = urlPreview.image;
                            if (urlPreview.author)
                              updatedEntry.author = urlPreview.author;
                            setFormEntry(updatedEntry);
                          }}
                        >
                          Use this preview data
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Source */}
              <div>
                <label className="block font-medium mb-1">
                  {formEntry.type === "twitter"
                    ? "Twitter Username"
                    : formEntry.type === "instagram"
                    ? "Instagram Username"
                    : "Source"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="border p-2 w-full rounded bg-white text-black"
                  placeholder={
                    formEntry.type === "twitter"
                      ? "@username"
                      : formEntry.type === "instagram"
                      ? "@username"
                      : "NY Times, Bloomberg, etc."
                  }
                  value={formEntry.source || ""}
                  onChange={(e) => setFormEntry({ ...formEntry, source: e.target.value })}
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block font-medium mb-1">
                  {formEntry.type === "twitter" || formEntry.type === "instagram"
                    ? "Full Name"
                    : "Author"}
                </label>
                <input
                  type="text"
                  className="border p-2 w-full rounded bg-white text-black"
                  placeholder={
                    formEntry.type === "twitter" || formEntry.type === "instagram"
                      ? "John Doe (full name of account owner)"
                      : "Author of the content"
                  }
                  value={formEntry.author || ""}
                  onChange={(e) => setFormEntry({ ...formEntry, author: e.target.value })}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-medium mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="border p-2 w-full rounded bg-white text-black"
                  value={formEntry.date || ""}
                  onChange={(e) => setFormEntry({ ...formEntry, date: e.target.value })}
                  required
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-medium mb-1">
                  Image URL{" "}
                  {(formEntry.type === "twitter" || formEntry.type === "instagram") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="url"
                  className="border p-2 w-full rounded bg-white text-black"
                  placeholder="https://example.com/image.jpg"
                  value={formEntry.image || ""}
                  onChange={(e) => setFormEntry({ ...formEntry, image: e.target.value })}
                  required={
                    formEntry.type === "twitter" || formEntry.type === "instagram"
                  }
                />
                {(formEntry.type === "twitter" || formEntry.type === "instagram") &&
                  !formEntry.image && (
                    <div className="mt-1 text-sm text-red-500">
                      Image is required for social media posts. Click "Use preview image"
                      above to automatically fetch it.
                    </div>
                  )}
              </div>

              {/* Social Media Metrics - only for social media types */}
              {(formEntry.type === "twitter" || formEntry.type === "instagram") && (
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Likes</label>
                    <input
                      type="number"
                      className="border p-2 w-full rounded bg-white text-black"
                      placeholder="0"
                      value={formEntry.likes || ""}
                      onChange={(e) =>
                        setFormEntry({
                          ...formEntry,
                          likes: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      {formEntry.type === "twitter" ? "Retweets" : "Shares"}
                    </label>
                    <input
                      type="number"
                      className="border p-2 w-full rounded bg-white text-black"
                      placeholder="0"
                      value={formEntry.shares || ""}
                      onChange={(e) =>
                        setFormEntry({
                          ...formEntry,
                          shares: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Comments</label>
                    <input
                      type="number"
                      className="border p-2 w-full rounded bg-white text-black"
                      placeholder="0"
                      value={formEntry.comments || ""}
                      onChange={(e) =>
                        setFormEntry({
                          ...formEntry,
                          comments: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block font-medium mb-1">
                  Tags <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="border p-2 flex-grow rounded bg-white text-black"
                    placeholder="Add a tag and press Enter or Add"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={handleAddTag}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formEntry.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white px-3 py-1 rounded-full flex items-center"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="md:col-span-2">
                <label className="block font-medium mb-1">
                  {formEntry.type === "twitter"
                    ? "Tweet Content"
                    : formEntry.type === "instagram"
                    ? "Post Caption"
                    : "Summary"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="border p-2 w-full rounded bg-white text-black"
                  rows={4}
                  placeholder={
                    formEntry.type === "twitter"
                      ? "Full text of the tweet"
                      : formEntry.type === "instagram"
                      ? "Caption of the Instagram post"
                      : "A brief summary of the content"
                  }
                  value={formEntry.summary || ""}
                  onChange={(e) =>
                    setFormEntry({ ...formEntry, summary: e.target.value })
                  }
                  required
                />
              </div>

              {/* Notes - not for social media */}
              {formEntry.type !== "twitter" && formEntry.type !== "instagram" && (
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Notes (Optional)</label>
                  <textarea
                    className="border p-2 w-full rounded bg-white text-black"
                    rows={3}
                    placeholder="Your personal notes or commentary on this research"
                    value={formEntry.notes || ""}
                    onChange={(e) =>
                      setFormEntry({ ...formEntry, notes: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <GrayButton type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Research Entry"}
            </GrayButton>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
