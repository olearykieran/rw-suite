// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/rfis/[rfiId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

import {
  fetchRfi,
  updateRfi,
  addActivity,
  fetchActivityLog,
  saveRfiVersion,
  fetchRfiVersions,
} from "@/lib/services/RfiService";
import { auth } from "@/lib/firebaseConfig";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { generateRfiPDF, RfiPDFData } from "@/lib/services/RfiPDFGenerator";
import { useLoadingBar } from "@/context/LoadingBarContext";

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
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export default function RfiDetailPage() {
  const { orgId, projectId, subProjectId, rfiId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    rfiId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  const [rfi, setRfi] = useState<RfiDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Activity log and versioning
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  // New comment state
  const [newComment, setNewComment] = useState("");

  // -----------------------------
  // Edit mode state & fields for updating the RFI
  // -----------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");
  const [importance, setImportance] = useState("");
  const [officialResponse, setOfficialResponse] = useState("");

  // ---------------------------------------
  // Fetch RFI + related data
  // ---------------------------------------
  async function loadFullData() {
    try {
      setLoading(true);
      const data = await fetchRfi(orgId, projectId, subProjectId, rfiId);
      // Ensure a 'subject' property exists.
      const completeData = { subject: "", ...data } as RfiDoc;
      setRfi(completeData);

      // Load activity log
      const logData = await fetchActivityLog(orgId, projectId, subProjectId, rfiId);
      const sortedLog = logData.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      setActivityLog(sortedLog);

      // Load versions
      setVersionLoading(true);
      const vData: any[] = await fetchRfiVersions(orgId, projectId, subProjectId, rfiId);
      const sortedVersions = vData.sort((a, b) => {
        const aTime = a.savedAt?.toMillis?.() || a.savedAt?.seconds || 0;
        const bTime = b.savedAt?.toMillis?.() || b.savedAt?.seconds || 0;
        return bTime - aTime;
      });
      setVersions(sortedVersions);
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
  }, [orgId, projectId, subProjectId, rfiId]);

  // When not editing, update the editable fields from the RFI record.
  useEffect(() => {
    if (rfi && !isEditing) {
      setSubject(rfi.subject || "");
      setQuestion(rfi.question || "");
      setAssignedTo(rfi.assignedTo || "");
      setDistributionList((rfi.distributionList || []).join(", "));
      const dueDateValue = rfi.dueDate ? new Date(rfi.dueDate) : null;
      setDueDate(
        dueDateValue && !isNaN(dueDateValue.getTime())
          ? dueDateValue.toISOString().slice(0, 10)
          : ""
      );
      setStatus(rfi.status || "");
      setImportance(rfi.importance || "");
      setOfficialResponse(rfi.officialResponse || "");
    }
  }, [rfi, isEditing]);

  // ---------------------------------------
  // Update RFI without sending a notification
  // ---------------------------------------
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!rfi) return;
    try {
      await updateRfi(orgId, projectId, subProjectId, rfiId, {
        subject,
        question,
        assignedTo,
        distributionList: distributionList
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean),
        dueDate,
        status,
        importance,
        officialResponse,
      });

      await saveRfiVersion(orgId, projectId, subProjectId, rfiId, {
        subject,
        question,
        assignedTo,
        distributionList: distributionList
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean),
        dueDate,
        status,
        importance,
        officialResponse,
        updatedAt: new Date(),
      });

      loadFullData();
      setIsEditing(false);
    } catch (err: any) {
      console.error("Update RFI error:", err);
      setError("Failed to update RFI");
    }
  }

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

  // ---------------------------------------
  // Download as PDF – using our RFI PDF generator
  // ---------------------------------------
  async function handleDownloadPDF() {
    if (!rfi) return;
    const pdfData: RfiPDFData = {
      rfiNumber: rfi.rfiNumber,
      subject: rfi.subject,
      question: rfi.question || "",
      assignedTo: rfi.assignedTo || "",
      dueDate: rfi.dueDate ? new Date(rfi.dueDate).toLocaleString() : "",
      status: rfi.status || "",
      importance: rfi.importance || "",
      officialResponse: rfi.officialResponse || "",
      distributionList: rfi.distributionList || [],
      attachments: rfi.attachments || [],
      logoUrl:
        "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe",
    };
    generateRfiPDF(pdfData);
  }

  if (loading) {
    return <div className="p-6">Loading RFI...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!rfi) {
    return <div className="p-6">No RFI found.</div>;
  }

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <GrayButton
          onClick={() => {
            setIsLoading(true);
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`
            );
          }}
        >
          &larr; Back to RFIs
        </GrayButton>
        <GrayButton onClick={handleDownloadPDF}>Download as PDF</GrayButton>
      </div>

      {/* RFI Header */}
      <div className="space-y-1 mt-4">
        <h1 className="text-2xl font-semibold">
          {rfi.rfiNumber ? `RFI #${rfi.rfiNumber}: ` : ""}
          {rfi.subject}
        </h1>
        {rfi.question && (
          <p className="text-neutral-600 dark:text-neutral-400">{rfi.question}</p>
        )}
      </div>

      {/* Edit Mode */}
      <div className="mt-4">
        {isEditing ? (
          <Card>
            <h2 className="text-lg font-semibold mb-2">Edit RFI</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block font-medium">Subject</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Question / Description</label>
                <textarea
                  className="border p-2 w-full rounded"
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Assigned To</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">
                  Distribution List (comma-separated)
                </label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  value={distributionList}
                  onChange={(e) => setDistributionList(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Due Date</label>
                <input
                  type="date"
                  className="border p-2 w-full rounded"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Status</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Importance</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Official Response</label>
                <textarea
                  className="border p-2 w-full rounded"
                  rows={3}
                  value={officialResponse}
                  onChange={(e) => setOfficialResponse(e.target.value)}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <GrayButton type="submit">Save</GrayButton>
                <GrayButton type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </GrayButton>
              </div>
            </form>
          </Card>
        ) : (
          <GrayButton onClick={() => setIsEditing(true)}>Edit RFI</GrayButton>
        )}
      </div>

      {/* Primary Details Display */}
      <Card className="mt-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <p className="font-medium text-neutral-600 dark:text-neutral-400">
                Assigned To
              </p>
              <p className="text-base">
                {rfi.assignedTo || <span className="opacity-70">N/A</span>}
              </p>
            </div>
            <div>
              <p className="font-medium text-neutral-600 dark:text-neutral-400">
                Due Date
              </p>
              <p className="text-base">
                {rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : "No due date"}
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <p className="font-medium text-neutral-600 dark:text-neutral-400">Status</p>
              <p className="text-base">{rfi.status || "N/A"}</p>
            </div>
            <div>
              <p className="font-medium text-neutral-600 dark:text-neutral-400">
                Importance
              </p>
              <p className="text-base">{rfi.importance || "N/A"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity / Comments Card */}
      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Activity / Comments</h2>
        {activityLog.length === 0 ? (
          <p className="text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activityLog.map((act) => (
              <li key={act.id} className="p-2 rounded border">
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
    </PageContainer>
  );
}
