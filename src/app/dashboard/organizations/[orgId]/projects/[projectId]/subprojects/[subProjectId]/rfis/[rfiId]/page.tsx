// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/[rfiId]/page.tsx

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

  // Local state for editing
  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");
  const [officialResponse, setOfficialResponse] = useState("");

  // Distribution
  const [distListInput, setDistListInput] = useState("");
  // Activity
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // Additional new attachments (photo/docs) after creation
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<FileList | null>(null);

  /**
   * Fetches the specified RFI document and activity log from Firestore,
   * populating local state for editing and display.
   */
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

  /**
   * handleUpdate => updates the RFI with the new status, importance, or official response.
   * Also logs an activity entry with the changes made.
   */
  async function handleUpdate() {
    if (!rfi) return;
    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        status,
        importance,
        officialResponse,
        distributionList: rfi.distributionList || [],
      });

      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: `RFI updated => status:${status}, importance:${importance}`,
        userId: auth.currentUser?.uid,
      });

      // Refresh
      await loadFullData();
    } catch (err: any) {
      console.error("Update RFI error:", err);
      setError("Failed to update RFI");
    }
  }

  /**
   * handleAddComment => adds a comment to the activity log
   */
  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: newComment.trim(),
        userId: auth.currentUser?.uid,
      });
      setNewComment("");

      await loadFullData();
    } catch (err: any) {
      console.error("Add comment error:", err);
      setError("Failed to add comment");
    }
  }

  /**
   * handleAddEmailToList => adds an email to the distributionList array
   */
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
      await loadFullData();
    } catch (err: any) {
      console.error("Error adding email:", err);
      setError("Failed to add email");
    }
  }

  /**
   * handleRemoveEmail => removes an email from the distributionList array
   */
  async function handleRemoveEmail(email: string) {
    if (!rfi || !rfi.distributionList) return;
    const newList = rfi.distributionList.filter((e) => e !== email);

    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        distributionList: newList,
      });
      await loadFullData();
    } catch (err: any) {
      console.error("Error removing email:", err);
      setError("Failed to remove email");
    }
  }

  /**
   * handleAttachNewFiles => merges new files into rfi.attachments, uploading them to Firebase Storage
   */
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

      // Upload them
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

      // Update Firestore
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        attachments: updatedAttachments,
      });

      // Log in activity
      await addActivity(orgId, projectId, subProjectId, rfiId, {
        message: `Uploaded ${merged.length} new file(s).`,
        userId: auth.currentUser?.uid,
      });

      setNewFiles(null);
      setNewPhotoFile(null);

      // Refresh
      await loadFullData();
    } catch (err: any) {
      console.error("Attach new files error:", err);
      setError("Failed to upload new files.");
    }
  }

  if (loading) return <div className="p-4">Loading RFI...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!rfi) return <div className="p-4">No RFI found.</div>;

  return (
    <main className="p-4 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`}
        className="text-blue-600 underline"
      >
        &larr; Back to RFIs
      </Link>

      <h1 className="text-2xl font-bold">
        {rfi.rfiNumber ? `RFI #${rfi.rfiNumber}: ${rfi.subject}` : rfi.subject}
      </h1>
      <p className="text-gray-700">{rfi.question}</p>

      {/* Basic Fields */}
      <div className="space-y-1">
        <p className="text-sm text-gray-600">
          <strong>Assigned To:</strong> {rfi.assignedTo || "N/A"}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Due Date:</strong>{" "}
          {rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : "N/A"}
        </p>
      </div>

      {/* Distribution List */}
      <div className="space-y-2">
        <label className="block font-medium">Distribution List</label>
        {rfi.distributionList && rfi.distributionList.length > 0 ? (
          <ul className="list-disc ml-5">
            {rfi.distributionList.map((email) => (
              <li key={email} className="flex items-center gap-2">
                <span>{email}</span>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No emails in distribution list.</p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Add someone@example.com"
            className="border p-2"
            value={distListInput}
            onChange={(e) => setDistListInput(e.target.value)}
          />
          <button
            onClick={handleAddEmailToList}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Add Email
          </button>
        </div>
      </div>

      {/* Attachments */}
      <div>
        <label className="block font-medium mb-1">Attachments:</label>
        {rfi.attachments && rfi.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {rfi.attachments.map((url: string, i: number) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No attachments.</p>
        )}
      </div>

      {/* Upload More Attachments Section */}
      <section className="border-t pt-4 space-y-4">
        <h2 className="text-lg font-semibold">Attach More Photos or Files</h2>
        <p className="text-sm text-gray-600">
          Add extra documentation or photos to this RFI.
        </p>

        <div className="space-y-2">
          <div>
            <label className="block mb-1 font-medium">
              Upload Document(s) (PDF, etc.)
            </label>
            <input type="file" multiple onChange={(e) => setNewFiles(e.target.files)} />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Take Photo (mobile) or Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setNewPhotoFile(e.target.files)}
            />
          </div>

          <button
            onClick={handleAttachNewFiles}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
          >
            Add to RFI
          </button>
        </div>
      </section>

      {/* Status & Importance */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2"
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

        <div>
          <label className="block font-medium mb-1">Importance</label>
          <select
            className="border p-2"
            value={importance}
            onChange={(e) => setImportance(e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Official Response */}
      <div>
        <label className="block font-medium mb-1">Official Response</label>
        <textarea
          className="border p-2 w-full"
          rows={3}
          value={officialResponse}
          onChange={(e) => setOfficialResponse(e.target.value)}
        />
      </div>

      {/*
        Remove special handling for closed status.
        Just always show "Update RFI" in a black button.
      */}
      <button
        onClick={handleUpdate}
        className="px-4 py-2 rounded text-white bg-black hover:bg-opacity-90"
      >
        Update RFI
      </button>

      {/* Activity / Comments */}
      <div className="border-t pt-4 space-y-4">
        <h2 className="text-xl font-semibold">Activity / Comments</h2>
        {activityLog.length === 0 ? (
          <p className="text-gray-700">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activityLog.map((act) => (
              <li key={act.id} className="bg-gray-50 p-2 rounded">
                <p className="text-sm">
                  {act.message}
                  <span className="text-gray-400 ml-2">
                    {act.createdAt
                      ? new Date(act.createdAt.seconds * 1000).toLocaleString()
                      : ""}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 items-center mt-3">
          <input
            type="text"
            placeholder="Add a comment..."
            className="border p-2 flex-1"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            onClick={handleAddComment}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Comment
          </button>
        </div>
      </div>
    </main>
  );
}
