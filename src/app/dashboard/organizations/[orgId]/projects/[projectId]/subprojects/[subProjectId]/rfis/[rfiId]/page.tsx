"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchRfi,
  updateRfi,
  addActivity,
  fetchActivityLog,
  saveRfiVersion,
  fetchRfiVersions,
} from "@/lib/services/RfiService"; // Combine all relevant imports
import { auth } from "@/lib/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

/**
 * For PDF parsing:
 * If you want to parse PDF text in the browser, call the new /api/parse-pdf endpoint we set up.
 */
async function extractPdfFromUrl(pdfUrl: string) {
  console.log("[PDF] Starting extraction:", pdfUrl);
  try {
    // Log URL
    console.log("[PDF] Sending request to parse-pdf endpoint");
    const response = await fetch("/api/parse-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfUrl }),
    });

    console.log("[PDF] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PDF] Parse failed:", errorText);
      throw new Error(`Failed to parse PDF: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[PDF] Parse result:", {
      success: data.success,
      hasText: Boolean(data.text),
      textLength: data.text?.length,
    });

    return data.text || "";
  } catch (err) {
    console.error("[PDF] Extraction error:", err);
    throw err;
  }
}

interface RfiDoc {
  id: string;
  rfiNumber?: number;
  subject: string;
  question?: string;
  status?: string;
  importance?: string;
  officialResponse?: string;
  assignedTo?: string;
  distributionList?: string[];
  dueDate?: Date | null;
  attachments?: string[];
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
}

export default function RfiDetailPage() {
  const { orgId, projectId, subProjectId, rfiId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    rfiId: string;
  };

  const [rfi, setRfi] = useState<RfiDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -- Editing states
  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");
  const [officialResponse, setOfficialResponse] = useState("");

  // -- Distribution
  const [distListInput, setDistListInput] = useState("");
  // -- Activity
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // -- New attachments
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<FileList | null>(null);

  // -- RFI Versions
  const [versions, setVersions] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  // =============== AI Summarize & Chat states ===============
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(""); // Summarize result
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // -- Additional AI Tools states
  const [aiMode, setAiMode] = useState("summary"); // 'summary' | 'riskAnalysis' | 'bestPractices' | 'lessonsLearned' | 'subDraft'
  const [extendedLoading, setExtendedLoading] = useState(false);
  const [extendedResult, setExtendedResult] = useState("");

  /* ============================================================
     1. Fetch the RFI + Activity + Versions
  ============================================================ */
  async function loadFullData() {
    try {
      setLoading(true);
      const data = await fetchRfi(orgId, projectId, subProjectId, rfiId);
      const rfiData = data as RfiDoc;

      setRfi(rfiData);
      setStatus(rfiData.status || "draft");
      setImportance(rfiData.importance || "normal");
      setOfficialResponse(rfiData.officialResponse || "");

      // Activity
      const logData = await fetchActivityLog(orgId, projectId, subProjectId, rfiId);
      const sorted = logData.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      setActivityLog(sorted);

      // Versions
      setVersionLoading(true);
      const vData = await fetchRfiVersions(orgId, projectId, subProjectId, rfiId);
      // Sort by savedAt desc
      const vSorted = vData.sort((a, b) => {
        const aTime = a.savedAt?.toMillis?.() || a.savedAt?.seconds || 0;
        const bTime = b.savedAt?.toMillis?.() || b.savedAt?.seconds || 0;
        return bTime - aTime;
      });
      setVersions(vSorted);
    } catch (err: any) {
      console.error("Load RFI error:", err);
      setError("Failed to load RFI");
    } finally {
      setLoading(false);
      setVersionLoading(false);
    }
  }

  useEffect(() => {
    if (orgId && projectId && subProjectId && rfiId) {
      loadFullData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, subProjectId, rfiId]);

  /* ============================================================
     2. Update RFI + Save Version
  ============================================================ */
  async function handleUpdate() {
    if (!rfi) return;
    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        status,
        importance,
        officialResponse,
        distributionList: rfi.distributionList || [],
      });

      // Save version snapshot
      await saveRfiVersion(orgId, projectId, subProjectId, rfiId, {
        status,
        importance,
        officialResponse,
        distributionList: rfi.distributionList,
        updatedAt: new Date(),
      });

      // Log the change
      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: `RFI updated => status:${status}, importance:${importance}`,
        userId: auth.currentUser?.uid,
      });

      loadFullData();
    } catch (err: any) {
      console.error("Update RFI error:", err);
      setError("Failed to update RFI");
    }
  }

  /* ============================================================
     2b. Revert to a Version
  ============================================================ */
  async function handleRevertVersion(version: any) {
    if (!rfi) return;
    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        status: version.status ?? "draft",
        importance: version.importance ?? "normal",
        officialResponse: version.officialResponse ?? "",
        distributionList: version.distributionList ?? [],
      });

      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: `RFI reverted to version from ${
          version.savedAt?.toDate?.() || version.savedAt
        }`,
        userId: auth.currentUser?.uid,
      });

      loadFullData();
    } catch (err: any) {
      console.error("Revert version error:", err);
      setError("Failed to revert version");
    }
  }

  /* ============================================================
     3. Add comment (activity log)
  ============================================================ */
  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: newComment.trim(),
        userId: auth.currentUser?.uid,
      });
      setNewComment("");
      loadFullData();
    } catch (err: any) {
      console.error("Add comment error:", err);
      setError("Failed to add comment");
    }
  }

  /* ============================================================
     4. Manage Distribution List
  ============================================================ */
  async function handleAddEmailToList() {
    if (!rfi) return;
    const newEmail = distListInput.trim();
    if (!newEmail) return;
    setDistListInput("");

    const newList = rfi.distributionList ? [...rfi.distributionList] : [];
    if (!newList.includes(newEmail)) {
      newList.push(newEmail);
    }

    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        distributionList: newList,
      });
      await saveRfiVersion(orgId, projectId, subProjectId, rfiId, {
        distributionList: newList,
        updatedAt: new Date(),
      });
      loadFullData();
    } catch (err: any) {
      console.error("Error adding email:", err);
      setError("Failed to add email");
    }
  }

  async function handleRemoveEmail(email: string) {
    if (!rfi || !rfi.distributionList) return;
    const newList = rfi.distributionList.filter((e) => e !== email);

    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        distributionList: newList,
      });
      await saveRfiVersion(orgId, projectId, subProjectId, rfiId, {
        distributionList: newList,
        updatedAt: new Date(),
      });
      loadFullData();
    } catch (err: any) {
      console.error("Error removing email:", err);
      setError("Failed to remove email");
    }
  }

  /* ============================================================
     5. Attach new files
  ============================================================ */
  async function handleAttachNewFiles() {
    if (!rfi) return;
    try {
      let merged: FileList | null = newFiles;
      if (newPhotoFile && newPhotoFile.length > 0) {
        if (!merged) {
          merged = newPhotoFile;
        } else {
          // Merge them with DataTransfer
          const dt = new DataTransfer();
          for (let i = 0; i < merged.length; i++) {
            dt.items.add(merged[i]);
          }
          for (let i = 0; i < newPhotoFile.length; i++) {
            dt.items.add(newPhotoFile[i]);
          }
          merged = dt.files;
        }
      }

      if (!merged || merged.length === 0) {
        alert("No files selected.");
        return;
      }

      const storage = getStorage();
      const newUrls: string[] = [];

      for (let i = 0; i < merged.length; i++) {
        const file = merged[i];
        const fileRef = ref(
          storage,
          `rfis/${orgId}/${projectId}/${subProjectId}/${rfiId}/${file.name}`
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        newUrls.push(downloadURL);
      }

      const updatedAttachments = [...(rfi.attachments || []), ...newUrls];

      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        attachments: updatedAttachments,
      });

      await saveRfiVersion(orgId, projectId, subProjectId, rfiId, {
        attachments: updatedAttachments,
        updatedAt: new Date(),
      });

      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: `Uploaded ${merged.length} new file(s).`,
        userId: auth.currentUser?.uid,
      });

      setNewFiles(null);
      setNewPhotoFile(null);

      loadFullData();
    } catch (err: any) {
      console.error("Attach new files error:", err);
      setError("Failed to upload new files.");
    }
  }

  /* ============================================================
     AI Summarize (Simple)
  ============================================================ */
  async function handleAISummarize() {
    if (!rfi) return;
    setAiError("");
    setAiLoading(true);
    setAiResult("");

    try {
      const response = await fetch("/api/ai/rfi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: rfi.subject,
          question: rfi.question,
          officialResponse,
          attachments: rfi.attachments,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "AI Summarize request failed.");
      }
      setAiResult(data.aiText);
    } catch (err: any) {
      console.error("AI Summarize Error:", err);
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  /* ============================================================
     AI Chat about the RFI
  ============================================================ */
  async function handleSendChat() {
    if (!chatInput.trim() || !rfi) return;
    setChatError("");
    setChatLoading(true);

    const newMessages = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(newMessages);
    setChatInput("");

    try {
      const response = await fetch("/api/ai/rfi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          rfiSubject: rfi.subject,
          rfiQuestion: rfi.question,
          rfiAttachments: rfi.attachments,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "AI Chat request failed.");
      }

      const updatedMessages = [
        ...newMessages,
        { role: "assistant", content: data.aiResponse },
      ];
      setChatMessages(updatedMessages);
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      setChatError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  /* ============================================================
     AI Tools for advanced tasks
  ============================================================ */
  async function handleAiToolInvoke() {
    if (!rfi) return;
    setExtendedLoading(true);
    setExtendedResult("");
    setAiError("");

    try {
      let pdfTexts = [];
      if (rfi.attachments) {
        console.log("[PDFHandler] Checking attachments:", rfi.attachments);
        for (const url of rfi.attachments) {
          if (url.includes("%2F") && decodeURIComponent(url).includes(".pdf")) {
            try {
              console.log(`[PDFHandler] Processing PDF URL: ${decodeURIComponent(url)}`);
              const response = await fetch("/api/parse-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pdfUrl: url }),
              });

              const data = await response.json();
              console.log(`[PDFHandler] Parse result:`, data);

              if (data.success && data.text) {
                pdfTexts.push(data.text);
                console.log(`[PDFHandler] Added text length:`, data.text.length);
              } else {
                console.error(`[PDFHandler] Parse failed:`, data.error);
              }
            } catch (err) {
              console.error(`[PDFHandler] Error processing PDF:`, err);
            }
          } else {
            console.log(`[PDFHandler] Not a PDF:`, decodeURIComponent(url));
          }
        }
      }

      console.log(`[PDFHandler] Total PDFs processed:`, pdfTexts.length);

      const historyText = versions
        .map((v) => {
          const date = v.savedAt?.toDate?.() || v.savedAt;
          return `Version from ${date}:\nStatus: ${v.status}, importance: ${v.importance}, officialResponse: ${v.officialResponse}`;
        })
        .join("\n\n");

      const response = await fetch("/api/ai/rfi/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: aiMode,
          rfiSubject: rfi.subject,
          rfiQuestion: rfi.question,
          officialResponse,
          pdfTexts,
          existingHistory: historyText,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "AI request failed");
      }

      setExtendedResult(data.result);
    } catch (err) {
      console.error("[PDFHandler] Handler error:", err);
      setAiError(err.message);
    } finally {
      setExtendedLoading(false);
    }
  }

  /* ============================================================
     Render
  ============================================================ */
  if (loading) {
    return <div className="p-6 text-sm">Loading RFI...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!rfi) {
    return <div className="p-6">No RFI found.</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`}
          className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          &larr; Back to RFIs
        </Link>
      </div>

      {/* RFI Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {rfi.rfiNumber ? `RFI #${rfi.rfiNumber}: ` : ""}
          {rfi.subject}
        </h1>
        {rfi.question && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{rfi.question}</p>
        )}
      </div>

      {/* Primary Details Card */}
      <Card>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Assigned To
              </p>
              <p className="text-base">
                {rfi.assignedTo || <span className="opacity-70">N/A</span>}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Due Date
              </p>
              <p className="text-base">
                {rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : "No due date"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Status
                </label>
                <select
                  id="status"
                  className="border bg-white dark:bg-neutral-800 dark:text-white p-2 rounded w-full sm:w-auto"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="inReview">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="importance"
                  className="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Importance
                </label>
                <select
                  id="importance"
                  className="border bg-white dark:bg-neutral-800 dark:text-white p-2 rounded w-full sm:w-auto"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-1">
            <label
              htmlFor="officialResponse"
              className="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              Official Response
            </label>
            <textarea
              id="officialResponse"
              rows={5}
              className="w-full border p-2 rounded bg-white text-black dark:bg-neutral-800 dark:text-white"
              value={officialResponse}
              onChange={(e) => setOfficialResponse(e.target.value)}
            />
          </div>
        </div>

        {/* Summarize + Save */}
        <div className="mt-4 flex flex-wrap gap-3">
          <GrayButton onClick={handleUpdate}>Save Changes</GrayButton>

          {/* AI Summarize */}
          <GrayButton onClick={handleAISummarize} disabled={aiLoading}>
            {aiLoading ? "Summarizing..." : "Summarize with AI"}
          </GrayButton>
          {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
        </div>

        {/* Summarize Result */}
        {aiResult && (
          <div className="mt-4 p-3 border rounded bg-neutral-50 dark:bg-neutral-800">
            <h3 className="font-semibold text-sm mb-2">AI Summarize Result</h3>
            <textarea
              className="w-full h-32 border p-2 rounded bg-white text-black dark:bg-neutral-700 dark:text-white"
              value={aiResult}
              onChange={(e) => setAiResult(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <GrayButton
                onClick={() => {
                  setOfficialResponse(aiResult);
                  setAiResult("");
                }}
              >
                Use This as Response
              </GrayButton>
              <GrayButton onClick={() => setAiResult("")}>Discard</GrayButton>
            </div>
          </div>
        )}
      </Card>

      {/* Distribution List + Attachments + Versions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Distribution List Card */}
        <Card>
          <h2 className="text-lg font-semibold">Distribution List</h2>
          {rfi.distributionList && rfi.distributionList.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {rfi.distributionList.map((email) => (
                <li key={email} className="flex items-center justify-between">
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="text-xs text-red-600 underline hover:text-red-700 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No emails added yet.</p>
          )}

          <div className="flex gap-2 mt-2">
            <input
              type="email"
              placeholder="someone@example.com"
              className="border p-2 rounded w-full bg-white text-black dark:bg-neutral-800 dark:text-white"
              value={distListInput}
              onChange={(e) => setDistListInput(e.target.value)}
            />
            <GrayButton onClick={handleAddEmailToList}>Add</GrayButton>
          </div>
        </Card>

        {/* Attachments Card */}
        <Card>
          <h2 className="text-lg font-semibold">Attachments</h2>
          {rfi.attachments && rfi.attachments.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {rfi.attachments.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {url.split("/").pop()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No attachments yet.</p>
          )}

          <div className="text-sm space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Docs / PDFs</label>
              <input
                type="file"
                multiple
                onChange={(e) => setNewFiles(e.target.files)}
                className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Photos (capture or upload)
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setNewPhotoFile(e.target.files)}
                className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600"
              />
            </div>

            <GrayButton onClick={handleAttachNewFiles}>Upload</GrayButton>
          </div>
        </Card>

        {/* Versions Card */}
        <Card>
          <h2 className="text-lg font-semibold">RFI Versions</h2>
          {versionLoading ? (
            <p>Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-neutral-500">No versions yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {versions.map((v) => {
                const savedAt = v.savedAt?.toDate?.() || v.savedAt;
                return (
                  <li
                    key={v.id}
                    className="p-1 border-b last:border-b-0 border-neutral-300"
                  >
                    <p className="text-xs font-semibold">
                      {savedAt ? new Date(savedAt).toLocaleString() : "Unknown date"}
                    </p>
                    <p className="text-xs">
                      Status: {v.status} | Importance: {v.importance}
                    </p>
                    <p className="text-xs truncate">
                      {v.officialResponse || "No official response"}
                    </p>
                    <button
                      onClick={() => handleRevertVersion(v)}
                      className="text-blue-500 text-xs underline mt-1"
                    >
                      Revert to this version
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Activity / Comments Card */}
      <Card>
        <h2 className="text-lg font-semibold">Activity / Comments</h2>
        {activityLog.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activityLog.map((act) => (
              <li key={act.id} className="p-2 rounded">
                <p>
                  {act.message}{" "}
                  {act.createdAt && (
                    <span className="ml-2 text-xs opacity-75">
                      {new Date(act.createdAt.seconds * 1000).toLocaleString()}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 items-center mt-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 border p-2 rounded bg-white text-black dark:bg-neutral-800 dark:text-white"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <GrayButton onClick={handleAddComment}>Comment</GrayButton>
        </div>
      </Card>

      {/* AI Chat Card */}
      <Card>
        <h2 className="text-lg font-semibold">Chat with AI about this RFI</h2>
        <div className="mt-2 max-h-80 overflow-y-auto p-2 border rounded bg-white dark:bg-neutral-800 dark:border-neutral-700">
          {chatMessages.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Ask the AI something about this RFI, attachments, or details.
            </p>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} className="mb-3">
                <p className="font-semibold">{msg.role === "user" ? "You" : "AI"}:</p>
                <p>{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {chatError && <p className="text-red-600 text-sm mt-2">{chatError}</p>}

        <div className="flex gap-2 items-center mt-2">
          <input
            type="text"
            placeholder="Type a question..."
            className="flex-1 border p-2 rounded bg-white text-black dark:bg-neutral-800 dark:text-white"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <GrayButton onClick={handleSendChat} disabled={chatLoading}>
            {chatLoading ? "Asking..." : "Send"}
          </GrayButton>
        </div>
      </Card>

      {/* Advanced AI Tools Card */}
      <Card>
        <h2 className="text-lg font-semibold">AI Tools</h2>
        <p className="text-sm text-neutral-500">
          Select a mode: Summaries, Risk Analysis, Best Practices, Lessons Learned, or
          Submittal Drafting.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <select
            className="border p-2 rounded bg-white text-black dark:bg-neutral-800 dark:text-white"
            value={aiMode}
            onChange={(e) => setAiMode(e.target.value)}
          >
            <option value="summary">Summary</option>
            <option value="riskAnalysis">Risk Analysis</option>
            <option value="bestPractices">Best Practices</option>
            <option value="lessonsLearned">Lessons Learned</option>
            <option value="subDraft">Draft Official Response</option>
          </select>
          <GrayButton onClick={handleAiToolInvoke} disabled={extendedLoading}>
            {extendedLoading ? "Thinking..." : "Generate"}
          </GrayButton>
        </div>
        {extendedResult && (
          <div className="mt-4 p-3 border rounded bg-neutral-50 dark:bg-neutral-800">
            <h3 className="font-semibold text-sm mb-2">AI Result ({aiMode})</h3>
            <textarea
              className="w-full h-32 border p-2 rounded bg-white text-black dark:bg-neutral-700 dark:text-white"
              value={extendedResult}
              onChange={(e) => setExtendedResult(e.target.value)}
            />
            {aiMode === "subDraft" && (
              <div className="mt-2 flex gap-2">
                <GrayButton
                  onClick={() => {
                    setOfficialResponse(extendedResult);
                    setExtendedResult("");
                  }}
                >
                  Use as Official Response
                </GrayButton>
                <GrayButton onClick={() => setExtendedResult("")}>Discard</GrayButton>
              </div>
            )}
          </div>
        )}
        {aiError && <p className="text-red-600 text-sm mt-2">{aiError}</p>}
      </Card>
    </PageContainer>
  );
}
