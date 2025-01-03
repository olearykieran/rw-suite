// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/rfis/[rfiId]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchRfi,
  updateRfi,
  addActivity,
  fetchActivityLog,
} from "@/lib/services/RfiService";
import { auth } from "@/lib/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

  // Editing states
  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");
  const [officialResponse, setOfficialResponse] = useState("");

  // Distribution
  const [distListInput, setDistListInput] = useState("");
  // Activity
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // New attachments
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<FileList | null>(null);

  // 1. Fetch the RFI + activity log
  async function loadFullData() {
    try {
      setLoading(true);
      const data = await fetchRfi(orgId, projectId, subProjectId, rfiId);
      const rfiData = data as RfiDoc;

      setRfi(rfiData);
      setStatus(rfiData.status || "draft");
      setImportance(rfiData.importance || "normal");
      setOfficialResponse(rfiData.officialResponse || "");

      const logData = await fetchActivityLog(orgId, projectId, subProjectId, rfiId);
      const sorted = logData.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      setActivityLog(sorted);
    } catch (err: any) {
      console.error("Load RFI error:", err);
      setError("Failed to load RFI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId && projectId && subProjectId && rfiId) {
      loadFullData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, subProjectId, rfiId]);

  // 2. Update RFI
  async function handleUpdate() {
    if (!rfi) return;
    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        status,
        importance,
        officialResponse,
        distributionList: rfi.distributionList || [],
      });

      // Log
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

  // 3. Add comment
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

  // 4. Manage distribution list
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
      loadFullData();
    } catch (err: any) {
      console.error("Error removing email:", err);
      setError("Failed to remove email");
    }
  }

  // 5. Attach new files
  async function handleAttachNewFiles() {
    if (!rfi) return;
    try {
      // Merge newFiles + newPhotoFile
      let merged: FileList | null = newFiles;
      if (newPhotoFile && newPhotoFile.length > 0) {
        if (!merged) {
          merged = newPhotoFile;
        } else {
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

      // Log
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

  // Loading or error states
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
          className="
            text-sm font-medium text-blue-600 underline 
            hover:text-blue-700 dark:text-blue-400 
            dark:hover:text-blue-300 transition-colors
          "
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
          {/* Column 1: Basic Fields */}
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
              {/* Status */}
              <div className="space-y-1">
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Status
                </label>
                <select
                  id="status"
                  className="
                    border bg-white dark:bg-neutral-800 
                    dark:text-white p-2 rounded
                    w-full sm:w-auto
                  "
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

              {/* Importance */}
              <div className="space-y-1">
                <label
                  htmlFor="importance"
                  className="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Importance
                </label>
                <select
                  id="importance"
                  className="
                    border bg-white dark:bg-neutral-800 
                    dark:text-white p-2 rounded
                    w-full sm:w-auto
                  "
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

          {/* Column 2: Official Response */}
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
              className="
                w-full border p-2 rounded 
                bg-white text-black dark:bg-neutral-800 dark:text-white
              "
              value={officialResponse}
              onChange={(e) => setOfficialResponse(e.target.value)}
            />
          </div>
        </div>

        {/* Update RFI button */}
        <div>
          <GrayButton onClick={handleUpdate}>Save Changes</GrayButton>
        </div>
      </Card>

      {/* Distribution List + Attachments */}
      <div className="grid gap-6 md:grid-cols-2">
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
                    className="
                      text-xs text-red-600 underline 
                      hover:text-red-700 
                      dark:hover:text-red-400
                    "
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No emails added yet.</p>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="someone@example.com"
              className="
                border p-2 rounded w-full
                bg-white text-black
                dark:bg-neutral-800 dark:text-white
              "
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
                    className="
                      underline text-blue-600 
                      hover:text-blue-700
                      dark:text-blue-400 dark:hover:text-blue-300
                    "
                  >
                    {url.split("/").pop()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No attachments yet.</p>
          )}

          <div className="text-sm space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Docs / PDFs</label>
              <input
                type="file"
                multiple
                onChange={(e) => setNewFiles(e.target.files)}
                className="
                  file:mr-2 file:py-2 file:px-3 
                  file:border-0 file:rounded 
                  file:bg-gray-300 file:text-black
                  hover:file:bg-gray-400
                  dark:file:bg-gray-700 dark:file:text-white
                  dark:hover:file:bg-gray-600
                "
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
                className="
                  file:mr-2 file:py-2 file:px-3 
                  file:border-0 file:rounded 
                  file:bg-gray-300 file:text-black
                  hover:file:bg-gray-400
                  dark:file:bg-gray-700 dark:file:text-white
                  dark:hover:file:bg-gray-600
                "
              />
            </div>

            <GrayButton onClick={handleAttachNewFiles}>Upload</GrayButton>
          </div>
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

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Add a comment..."
            className="
              flex-1 border p-2 rounded
              bg-white text-black
              dark:bg-neutral-800 dark:text-white
            "
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <GrayButton onClick={handleAddComment}>Comment</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
