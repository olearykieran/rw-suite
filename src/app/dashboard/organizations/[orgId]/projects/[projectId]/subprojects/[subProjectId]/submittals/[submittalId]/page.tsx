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

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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
  actionRequiredUserId?: string;
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

  // For fade-in animation
  const [showContent, setShowContent] = useState(false);

  // 1. Load the Submittal + Activity
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
      // Trigger the fade-in after data loads
      setTimeout(() => setShowContent(true), 100);
    }
  }

  useEffect(() => {
    if (orgId && projectId && subProjectId && submittalId) {
      loadFullData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, subProjectId, submittalId]);

  // 2. Update submittal
  async function handleUpdate() {
    if (!submittal) return;
    try {
      await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
        status,
        importance,
        officialResponse,
        workflow,
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

  // 3. Approve/Reject a single workflow step
  async function handleWorkflowAction(index: number, newStatus: "approved" | "rejected") {
    if (!submittal) return;
    const updatedSteps = [...workflow];
    updatedSteps[index].status = newStatus;

    let newSubmittalStatus = submittal.status;
    if (updatedSteps.every((step) => step.status === "approved")) {
      newSubmittalStatus = "approved";
    } else if (updatedSteps.some((step) => step.status === "rejected")) {
      newSubmittalStatus = "open"; // or "rejected"
    }

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

  // 4. Resubmit as new version
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

    // Then update main doc
    await updateSubmittal(orgId, projectId, subProjectId, submittalId, {
      version: newVersion,
      status: "open",
      updatedAt: serverTimestamp(),
    });

    await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
      message: `Resubmitted as v${newVersion}`,
      userId: auth.currentUser?.uid,
    });

    await loadFullData();
  }

  // 5. Attach new files
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

  // 6. Add comment
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

  // 7. Link to spec section
  async function handleLinkSpec() {
    if (!submittal || !specSection.trim()) return;
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

  // ---------- RENDER ----------
  if (loading) return <div className="p-6">Loading Submittal...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!submittal) return <div className="p-6">No submittal found.</div>;

  const isClosed =
    status.toLowerCase() === "closed" || status.toLowerCase() === "approved";

  return (
    <PageContainer>
      {/* === Section #1: Back link + Heading === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`}
          className="
            text-sm font-medium text-blue-600 underline 
            hover:text-blue-700 dark:text-blue-400 
            dark:hover:text-blue-300 transition-colors
          "
        >
          &larr; Back to Submittals
        </Link>

        <div className="space-y-1 mt-2">
          <h1 className="text-2xl font-bold">
            {submittal.submittalNumber
              ? `Submittal #${submittal.submittalNumber} (v${submittal.version || 1}): ${
                  submittal.subject
                }`
              : submittal.subject}
          </h1>
          <p className="text-sm opacity-80">Type: {submittal.submittalType || "N/A"}</p>
        </div>
      </div>

      {/* === Section #2: Basic Info & Workflow === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <div className="text-sm space-y-1">
            <p>
              <strong>Assigned To:</strong> {submittal.assignedTo || "N/A"}
            </p>
            <p>
              <strong>Due Date:</strong>{" "}
              {submittal.dueDate
                ? new Date(submittal.dueDate).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          {/* Workflow steps */}
          {workflow.length > 0 && (
            <div className="pt-4 space-y-2">
              <h2 className="text-lg font-semibold">Approval Workflow</h2>
              <ul className="list-disc ml-5 space-y-2 text-sm">
                {workflow.map((step, idx) => (
                  <li key={idx}>
                    <strong>{step.role}</strong> – {step.userId}{" "}
                    {step.status === "pending" && (
                      <span className="ml-2 text-blue-500">(Pending)</span>
                    )}
                    {step.status === "approved" && (
                      <span className="ml-2 text-green-600">[Approved]</span>
                    )}
                    {step.status === "rejected" && (
                      <span className="ml-2 text-red-600">[Rejected]</span>
                    )}
                    {/* If the current user has the same userId, let them Approve/Reject */}
                    {auth.currentUser?.uid === step.userId &&
                      step.status === "pending" && (
                        <div className="flex gap-2 mt-1">
                          <GrayButton
                            onClick={() => handleWorkflowAction(idx, "approved")}
                          >
                            Approve
                          </GrayButton>
                          <GrayButton
                            onClick={() => handleWorkflowAction(idx, "rejected")}
                          >
                            Reject
                          </GrayButton>
                        </div>
                      )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* === Section #3: Attachments === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[200ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Attachments</h2>
          {submittal.attachments && submittal.attachments.length > 0 ? (
            <ul className="list-disc ml-5 text-sm">
              {submittal.attachments.map((url: string, i: number) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      text-blue-600 underline 
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
            <p className="text-sm opacity-70">No attachments yet.</p>
          )}

          {/* Upload new attachments */}
          <div className="space-y-3 pt-4 text-sm">
            <div>
              <label className="block font-medium mb-1">
                Upload Document(s) (PDF, etc.)
              </label>
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
              <label className="block font-medium mb-1">
                Take Photo (mobile) or Upload Image
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

            <GrayButton onClick={handleAttachNewFiles}>Add to Submittal</GrayButton>
          </div>
        </Card>
      </div>

      {/* === Section #4: Link to Spec Section === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[300ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Link to Spec Section</h2>
          <p className="text-sm">Example: “03 30 00 – Cast-In-Place Concrete”</p>
          <div className="flex gap-2 mt-2">
            <input
              className="
                border p-2 rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="e.g. 03 30 00"
              value={specSection}
              onChange={(e) => setSpecSection(e.target.value)}
            />
            <GrayButton onClick={handleLinkSpec}>Link Spec</GrayButton>
          </div>
        </Card>
      </div>

      {/* === Section #5: Status & Importance === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[400ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div>
              <label className="block font-medium mb-1">Status</label>
              <select
                className="
                  border p-2 rounded
                  bg-white text-black
                  dark:bg-neutral-800 dark:text-white
                "
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
                className="
                  border p-2 rounded
                  bg-white text-black
                  dark:bg-neutral-800 dark:text-white
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

          {/* Official Response */}
          <div>
            <label className="block font-medium mt-4 mb-1">Official Response</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              value={officialResponse}
              onChange={(e) => setOfficialResponse(e.target.value)}
            />
          </div>

          {/* Update / Resubmit buttons */}
          <div className="flex gap-4 mt-4">
            <GrayButton onClick={handleUpdate} disabled={isClosed}>
              {isClosed ? "SUBMITTAL CLOSED/APPROVED" : "Update Submittal"}
            </GrayButton>
            {(submittal.status === "open" || submittal.status === "inReview") && (
              <GrayButton onClick={handleResubmit}>Revise & Resubmit</GrayButton>
            )}
          </div>
        </Card>
      </div>

      {/* === Section #6: Activity / Comments === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[500ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Activity / Comments</h2>
          {activityLog.length === 0 ? (
            <p className="text-sm text-neutral-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm mt-2">
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

          <div className="flex gap-2 items-center mt-3">
            <input
              type="text"
              placeholder="Add a comment..."
              className="
                flex-1 border p-2 rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <GrayButton onClick={handleAddComment}>Comment</GrayButton>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
