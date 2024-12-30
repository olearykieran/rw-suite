// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/submittals/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { createSubmittal } from "@/lib/services/SubmittalService";

enum Step {
  BASIC_INFO,
  ASSIGNMENT,
  DATES_FILES,
  WORKFLOW, // new step for multi-step approvals
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
  const [ccList, setCcList] = useState(""); // optional
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [photoFile, setPhotoFile] = useState<FileList | null>(null);

  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");

  // Example workflow array
  // We'll gather from user input, or pre-populate
  const [workflow, setWorkflow] = useState<
    { role: string; userId: string; status: "pending" | "approved" | "rejected" }[]
  >([]);

  // Steps
  const [currentStep, setCurrentStep] = useState<Step>(Step.BASIC_INFO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // For adding a new step to workflow
  const [newRole, setNewRole] = useState("");
  const [newUserId, setNewUserId] = useState("");

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
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Create New Submittal (Wizard)</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: BASIC_INFO */}
        {currentStep === Step.BASIC_INFO && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Subject</label>
              <input
                className="border p-2 w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Submittal subject..."
                required
              />
            </div>
            <div>
              <label className="block font-medium">Submittal Type</label>
              <input
                className="border p-2 w-full"
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
                className="border p-2 w-full"
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
                className="border p-2 w-full"
                value={distributionList}
                onChange={(e) => setDistributionList(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
            <div>
              <label className="block font-medium">CC List (FYI only)</label>
              <input
                className="border p-2 w-full"
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
                className="border p-2 w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium">Upload Documents (PDF, etc.)</label>
              <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
            </div>
            <div>
              <label className="block font-medium">Take/Upload Photo (mobile)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files)}
              />
            </div>
          </div>
        )}

        {/* Step 4: WORKFLOW */}
        {currentStep === Step.WORKFLOW && (
          <div className="space-y-4">
            <p className="text-gray-700">
              **Multi-step approvals**: Add roles (e.g. “Architect”, “Engineer”) and their
              user IDs. Each step defaults to “pending.”
            </p>

            <ul className="list-disc ml-5 space-y-2">
              {workflow.map((w, idx) => (
                <li key={idx}>
                  <strong>{w.role}</strong> – {w.userId} (Status: {w.status})
                </li>
              ))}
            </ul>

            <div className="flex gap-2 items-center">
              <input
                className="border p-2"
                placeholder="Role (Architect, Engineer...)"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <input
                className="border p-2"
                placeholder="UserId or Email"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
              <button
                type="button"
                onClick={addWorkflowStep}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Add Step
              </button>
            </div>
          </div>
        )}

        {/* Step 5: REVIEW_SUBMIT */}
        {currentStep === Step.REVIEW_SUBMIT && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Status</label>
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
              <label className="block font-medium">Importance</label>
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

            <p className="font-medium text-gray-700">Summary</p>
            <ul className="list-disc ml-5 text-gray-700">
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

        {/* Wizard Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Cancel
          </button>

          {currentStep !== Step.BASIC_INFO && (
            <button
              type="button"
              onClick={prevStep}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back
            </button>
          )}

          {currentStep < Step.REVIEW_SUBMIT && (
            <button
              type="button"
              onClick={nextStep}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Next
            </button>
          )}

          {currentStep === Step.REVIEW_SUBMIT && (
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
            >
              {loading ? "Creating..." : "Submit Submittal"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
