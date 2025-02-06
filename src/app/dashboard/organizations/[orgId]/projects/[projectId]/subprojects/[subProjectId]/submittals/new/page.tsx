// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/submittals/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { createSubmittal } from "@/lib/services/SubmittalService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

enum Step {
  BASIC_INFO,
  ASSIGNMENT,
  DATES_FILES,
  WORKFLOW,
  REVIEW_SUBMIT,
}

export default function NewSubmittalWizardPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [authUser] = useAuthState(auth);

  // Fields
  const [subject, setSubject] = useState("");
  const [submittalType, setSubmittalType] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [ccList, setCcList] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [photoFile, setPhotoFile] = useState<FileList | null>(null);

  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");

  // For multi-step approvals
  const [workflow, setWorkflow] = useState<
    { role: string; userId: string; status: "pending" | "approved" | "rejected" }[]
  >([]);

  // Steps
  const [currentStep, setCurrentStep] = useState<Step>(Step.BASIC_INFO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For adding a new step to the workflow
  const [newRole, setNewRole] = useState("");
  const [newUserId, setNewUserId] = useState("");

  function nextStep() {
    if (currentStep < Step.REVIEW_SUBMIT) {
      setCurrentStep((prev) => prev + 1);
    }
  }
  function prevStep() {
    if (currentStep > Step.BASIC_INFO) {
      setCurrentStep((prev) => prev - 1);
    }
  }
  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`
    );
  }

  function addWorkflowStep() {
    if (!newRole.trim() || !newUserId.trim()) return;
    setWorkflow((prev) => [
      ...prev,
      { role: newRole, userId: newUserId, status: "pending" },
    ]);
    setNewRole("");
    setNewUserId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const distArray = distributionList
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const ccArray = ccList
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      // Combine doc + photo
      let allFiles: FileList | null = files;
      if (photoFile && photoFile.length > 0) {
        if (!allFiles) {
          allFiles = photoFile;
        } else {
          const dt = new DataTransfer();
          for (let i = 0; i < allFiles.length; i++) {
            dt.items.add(allFiles[i]);
          }
          for (let i = 0; i < photoFile.length; i++) {
            dt.items.add(photoFile[i]);
          }
          allFiles = dt.files;
        }
      }

      const creatorEmail = authUser?.email ?? "";

      await createSubmittal({
        orgId,
        projectId,
        subProjectId,
        subject,
        submittalType,
        assignedTo,
        distributionList: distArray,
        ccList: ccArray,
        dueDate,
        status,
        importance,
        files: allFiles,
        createdByEmail: creatorEmail,
        workflow,
        version: 1, // initial version
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/submittals`
      );
    } catch (err: any) {
      console.error("Create Submittal Wizard error:", err);
      setError(err.message || "Failed to create Submittal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Submittal (Wizard)</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 dark:bg-red-900 p-2 rounded">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          {/* Step 1: BASIC_INFO */}
          {currentStep === Step.BASIC_INFO && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium">Subject</label>
                <input
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Submittal subject..."
                  required
                />
              </div>
              <div>
                <label className="block font-medium">Submittal Type</label>
                <input
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={submittalType}
                  onChange={(e) => setSubmittalType(e.target.value)}
                  placeholder="e.g. Shop Drawing, Product Data..."
                />
              </div>
            </div>
          )}

          {/* Step 2: ASSIGNMENT */}
          {currentStep === Step.ASSIGNMENT && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium">Assigned To (email or userId)</label>
                <input
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="someone@example.com"
                />
              </div>
              <div>
                <label className="block font-medium">
                  Distribution List (comma-separated)
                </label>
                <input
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={distributionList}
                  onChange={(e) => setDistributionList(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
              <div>
                <label className="block font-medium">CC List (FYI only)</label>
                <input
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={ccList}
                  onChange={(e) => setCcList(e.target.value)}
                  placeholder="ccUser1@example.com, ccUser2@example.com"
                />
              </div>
            </div>
          )}

          {/* Step 3: DATES_FILES */}
          {currentStep === Step.DATES_FILES && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium">Due Date</label>
                <input
                  type="date"
                  className="
                    border p-2 w-full rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Upload Documents (PDF, etc.)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="
                    file:mr-2 file:py-2 file:px-3 
                    file:border-0 file:rounded 
                    file:bg-gray-300 file:text-black
                    hover:file:bg-gray-400
                    dark:file:bg-gray-700 dark:file:text-white
                    dark:hover:file:bg-gray-600
                    transition-colors
                  "
                />
              </div>
              <div>
                <label className="block font-medium">Take/Upload Photo (mobile)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files)}
                  className="
                    file:mr-2 file:py-2 file:px-3 
                    file:border-0 file:rounded 
                    file:bg-gray-300 file:text-black
                    hover:file:bg-gray-400
                    dark:file:bg-gray-700 dark:file:text-white
                    dark:hover:file:bg-gray-600
                    transition-colors
                  "
                />
              </div>
            </div>
          )}

          {/* Step 4: WORKFLOW */}
          {currentStep === Step.WORKFLOW && (
            <div className="space-y-4">
              <p className="">
                **Multi-step approvals**: Add roles (e.g. “Architect”, “Engineer”) and
                user IDs. Each step defaults to “pending.”
              </p>
              <ul className="list-disc ml-5 space-y-2 ">
                {workflow.map((w, idx) => (
                  <li key={idx}>
                    <strong>{w.role}</strong> – {w.userId} (Status: {w.status})
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 items-center">
                <input
                  className="
                    border p-2 rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  placeholder="Role (Architect, Engineer...)"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
                <input
                  className="
                    border p-2 rounded
                    bg-white text-black
                    dark:bg-neutral-800 dark:text-white
                  "
                  placeholder="UserId or Email"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
                <GrayButton type="button" onClick={addWorkflowStep}>
                  Add Step
                </GrayButton>
              </div>
            </div>
          )}

          {/* Step 5: REVIEW_SUBMIT */}
          {currentStep === Step.REVIEW_SUBMIT && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium">Status</label>
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
                <label className="block font-medium">Importance</label>
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

              <p className="font-medium">Summary:</p>
              <ul className="list-disc ml-5  space-y-1">
                <li>Subject: {subject}</li>
                <li>Type: {submittalType}</li>
                <li>Assigned To: {assignedTo}</li>
                <li>Distribution: {distributionList}</li>
                <li>CC: {ccList}</li>
                <li>Due Date: {dueDate}</li>
                <li>Status: {status}</li>
                <li>Importance: {importance}</li>
                <li>
                  Workflow Steps: {workflow.length}
                  {workflow.map((w) => ` [${w.role} - ${w.userId}]`).join("")}
                </li>
                <li>
                  Attachments: {(files?.length || 0) + (photoFile?.length || 0)} file(s)
                </li>
              </ul>
            </div>
          )}
        </Card>

        {/* Wizard Buttons */}
        <div className="flex gap-4">
          {/* We can optionally remove this Cancel since we have a top “Cancel” button. */}
          <GrayButton type="button" onClick={handleCancel}>
            Cancel
          </GrayButton>

          {currentStep !== Step.BASIC_INFO && (
            <GrayButton type="button" onClick={prevStep}>
              Back
            </GrayButton>
          )}

          {currentStep < Step.REVIEW_SUBMIT && (
            <GrayButton type="button" onClick={nextStep}>
              Next
            </GrayButton>
          )}

          {currentStep === Step.REVIEW_SUBMIT && (
            <GrayButton type="submit" disabled={loading}>
              {loading ? "Creating..." : "Submit Submittal"}
            </GrayButton>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
