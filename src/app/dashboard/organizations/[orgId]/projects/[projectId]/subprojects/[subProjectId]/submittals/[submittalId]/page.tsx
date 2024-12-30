// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/submittals/[submittalId]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchSubmittal,
  updateSubmittal,
  addSubmittalActivity,
  fetchSubmittalActivityLog,
  createSubmittalVersion,
} from "@/lib/services/SubmittalService";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface WorkflowStep {
  role: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
}

interface SubmittalDoc {
  id: string;
  submittalNumber?: number;
  subject?: string;
  submittalType?: string;
  status?: string;
  importance?: string;
  officialResponse?: string;
  assignedTo?: string;
  distributionList?: string[];
  ccList?: string[];
  dueDate?: Date | null;
  attachments?: string[];
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
  workflow?: WorkflowStep[];
  version?: number;
  actionRequiredUserId?: string; // if you track “action required”
}

export default function SubmittalDetailPage() {
  const { orgId, projectId, subProjectId, submittalId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    submittalId: string;
  };

  const [submittal, setSubmittal] = useState<SubmittalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edits
  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");
  const [officialResponse, setOfficialResponse] = useState("");

  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // Additional attachments
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<FileList | null>(null);

  // Spec Book linking (stub)
  const [specSection, setSpecSection] = useState(""); // e.g. "03 30 00"
  // Workflow editing
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);

  async function loadFullData() {
    try {
      setLoading(true);
      const data = await fetchSubmittal(orgId, projectId, subProjectId, submittalId);
      const subData = data as SubmittalDoc;

      setSubmittal(subData);
      setStatus(subData.status || "draft");
      setImportance(subData.importance || "normal");
      setOfficialResponse(subData.officialResponse || "");
      setWorkflow(subData.workflow || []);

      const logData = await fetchSubmittalActivityLog(
        orgId,
        projectId,
        subProjectId,
        submittalId
      );
      const sorted = logData.sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      setActivityLog(sorted);
    } catch (err: any) {
      console.error("Load Submittal error:", err);
      setError("Failed to load submittal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId && projectId && subProjectId && submittalId) {
      loadFullData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, subProjectId, submittalId]);

  // Update submittal
  async function handleUpdate() {
    if (!submittal) return;
    try {
      await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
        status,
        importance,
        officialResponse,
        workflow, // updated workflow array
      });
      await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
        message: `Submittal updated => status:${status}, importance:${importance}`,
        userId: auth.currentUser?.uid,
      });
      await loadFullData();
    } catch (err: any) {
      console.error("Update Submittal error:", err);
      setError("Failed to update submittal");
    }
  }

  // Approve or Reject a single workflow step
  async function handleWorkflowAction(index: number, newStatus: "approved" | "rejected") {
    if (!submittal) return;
    const updatedSteps = [...workflow];
    updatedSteps[index].status = newStatus;

    // If you want to auto-set submittal’s status if all steps are approved, do that here:
    let newSubmittalStatus = submittal.status;
    if (updatedSteps.every((step) => step.status === "approved")) {
      newSubmittalStatus = "approved";
    } else if (updatedSteps.some((step) => step.status === "rejected")) {
      newSubmittalStatus = "open"; // or "rejected" if you prefer
    }

    // Then update
    await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
      workflow: updatedSteps,
      status: newSubmittalStatus,
    });

    await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
      message: `Workflow step for ${updatedSteps[index].role} set to ${newStatus}`,
      userId: auth.currentUser?.uid,
    });

    setWorkflow(updatedSteps);
    setStatus(newSubmittalStatus || "open");
    await loadFullData();
  }

  // Resubmit as new version
  async function handleResubmit() {
    if (!submittal) return;
    const newVersion = (submittal.version || 1) + 1;

    // Save a “version doc” with the old submittal state
    await createSubmittalVersion(
      orgId,
      projectId,
      subProjectId,
      submittalId,
      newVersion,
      {
        fromVersion: submittal.version || 1,
        oldStatus: submittal.status,
        oldWorkflow: submittal.workflow,
        timestamp: new Date(),
      }
    );

    // Then update main doc with version++
    await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
      version: newVersion,
      status: "open", // revert to open or “revise & resubmit”
      updatedAt: serverTimestamp(),
    });

    await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
      message: `Resubmitted as v${newVersion}`,
      userId: auth.currentUser?.uid,
    });

    await loadFullData();
  }

  // Attach new files
  async function handleAttachNewFiles() {
    if (!submittal) return;
    try {
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
          `submittals/${orgId}/${projectId}/${subProjectId}/${submittalId}/${file.name}`
        );
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        newUrls.push(downloadURL);
      }

      const updatedAttachments = [...(submittal.attachments || []), ...newUrls];

      // update doc
      await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
        attachments: updatedAttachments,
      });

      await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
        message: `Uploaded ${merged.length} new file(s).`,
        userId: auth.currentUser?.uid,
      });

      setNewFiles(null);
      setNewPhotoFile(null);

      await loadFullData();
    } catch (err: any) {
      console.error("Attach new files error:", err);
      setError("Failed to upload new files.");
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
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

  // Link submittal to a spec section
  async function handleLinkSpec() {
    if (!submittal || !specSection.trim()) return;
    // For demonstration, we store a “specSection” in doc
    await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
      specSection,
    });
    await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
      message: `Linked to spec section ${specSection}`,
      userId: auth.currentUser?.uid,
    });
    setSpecSection("");
    await loadFullData();
  }

  // Add comment about action required
  if (loading) return <div className="p-4">Loading Submittal...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!submittal) return <div className="p-4">No submittal found.</div>;

  const isClosed =
    status.toLowerCase() === "closed" || status.toLowerCase() === "approved";

  return (
    <main className="p-4 space-y-6">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`}
        className="text-blue-600 underline"
      >
        &larr; Back to Submittals
      </Link>

      <h1 className="text-2xl font-bold">
        {submittal.submittalNumber
          ? `Submittal #${submittal.submittalNumber} (v${submittal.version || 1}): ${
              submittal.subject
            }`
          : submittal.subject}
      </h1>
      <p className="text-gray-700">Type: {submittal.submittalType || "N/A"}</p>

      <div className="space-y-1">
        <p className="text-sm text-gray-600">
          <strong>Assigned To:</strong> {submittal.assignedTo || "N/A"}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Due Date:</strong>{" "}
          {submittal.dueDate ? new Date(submittal.dueDate).toLocaleDateString() : "N/A"}
        </p>
      </div>

      {/* Workflow steps */}
      {workflow.length > 0 && (
        <section className="border-t pt-4 space-y-2">
          <h2 className="text-lg font-semibold">Approval Workflow</h2>
          <ul className="list-disc ml-5 space-y-2">
            {workflow.map((step, idx) => (
              <li key={idx}>
                <strong>{step.role}</strong> – {step.userId}
                {step.status === "pending" && (
                  <span className="ml-2 text-blue-500">(Waiting for approval)</span>
                )}
                {step.status === "approved" && (
                  <span className="ml-2 text-green-600">[Approved]</span>
                )}
                {step.status === "rejected" && (
                  <span className="ml-2 text-red-600">[Rejected]</span>
                )}
                {/* If the current user has the same userId, let them Approve/Reject */}
                {auth.currentUser?.uid === step.userId && step.status === "pending" && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleWorkflowAction(idx, "approved")}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleWorkflowAction(idx, "rejected")}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Attachments */}
      <div>
        <label className="block font-medium mb-1">Attachments:</label>
        {submittal.attachments && submittal.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {submittal.attachments.map((url: string, i: number) => (
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

      {/* Upload new attachments */}
      <section className="border-t pt-4 space-y-4">
        <h2 className="text-lg font-semibold">Attach More Photos or Files</h2>
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
            Add to Submittal
          </button>
        </div>
      </section>

      {/* Spec Book linking */}
      <section className="border-t pt-4 space-y-4">
        <h2 className="text-lg font-semibold">Link to Spec Section</h2>
        <p className="text-sm text-gray-600">
          Example: “03 30 00 – Cast-In-Place Concrete”
        </p>
        <div className="flex gap-2 items-center">
          <input
            className="border p-2"
            placeholder="e.g. 03 30 00"
            value={specSection}
            onChange={(e) => setSpecSection(e.target.value)}
          />
          <button
            onClick={handleLinkSpec}
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm"
          >
            Link Spec
          </button>
        </div>
      </section>

      {/* Status & Importance */}
      <div className="flex gap-4 flex-wrap mt-4">
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
            <option value="approved">Approved</option>
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
        <label className="block font-medium mb-1 mt-2">Official Response</label>
        <textarea
          className="border p-2 w-full"
          rows={3}
          value={officialResponse}
          onChange={(e) => setOfficialResponse(e.target.value)}
        />
      </div>

      {/* Buttons to Update or Resubmit */}
      <div className="flex gap-4">
        <button
          onClick={handleUpdate}
          className={`px-4 py-2 rounded text-white hover:bg-opacity-90 ${
            isClosed ? "bg-red-600" : "bg-black"
          }`}
        >
          {isClosed ? "SUBMITTAL CLOSED/APPROVED" : "Update Submittal"}
        </button>

        {/* Only show “Resubmit” if it's partially rejected or incomplete */}
        {submittal.status === "open" || submittal.status === "inReview" ? (
          <button
            onClick={handleResubmit}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Revise & Resubmit
          </button>
        ) : null}
      </div>

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
