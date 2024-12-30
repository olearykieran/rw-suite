// src/app/dashboard/organizations/[orgId]/projects/[projectId]/rfis/new/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { createRfi } from "@/lib/services/RfiService";
import { auth } from "@/lib/firebaseConfig";

enum Step {
  SUBJECT_QUESTION,
  ASSIGNMENT,
  DATES_FILES,
  REVIEW_SUBMIT,
}

export default function NewRfiWizardPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [authUser] = useAuthState(auth);

  // Form states
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [dueDate, setDueDate] = useState("");

  // We'll unify both doc and photo files later
  const [files, setFiles] = useState<FileList | null>(null);
  const [photoFile, setPhotoFile] = useState<FileList | null>(null);

  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");

  const [currentStep, setCurrentStep] = useState<Step>(Step.SUBJECT_QUESTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function nextStep() {
    if (currentStep < Step.REVIEW_SUBMIT) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function prevStep() {
    if (currentStep > Step.SUBJECT_QUESTION) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert distribution list to array
      const distArray = distributionList
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      // Combine doc files + photo files into one array
      let allFiles: FileList | null = files;
      if (photoFile && photoFile.length > 0) {
        if (!allFiles) {
          allFiles = photoFile;
        } else {
          // Merge them using DataTransfer
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

      await createRfi({
        orgId,
        projectId,
        subProjectId,
        subject,
        question,
        assignedTo,
        distributionList: distArray,
        dueDate,
        status,
        importance,
        files: allFiles,
        createdByEmail: creatorEmail,
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`
      );
    } catch (err: any) {
      console.error("Create RFI Wizard error:", err);
      setError(err.message || "Failed to create RFI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Create New RFI (Wizard)</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Subject & Question */}
        {currentStep === Step.SUBJECT_QUESTION && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Subject</label>
              <input
                className="border p-2 w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="RFI Subject"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Question / Description</label>
              <textarea
                className="border p-2 w-full"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Details about this RFI..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Assignment */}
        {currentStep === Step.ASSIGNMENT && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">
                Assigned To (email or userId)
              </label>
              <input
                className="border p-2 w-full"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="someone@example.com"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">
                Distribution List (comma-separated emails)
              </label>
              <input
                className="border p-2 w-full"
                value={distributionList}
                onChange={(e) => setDistributionList(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
          </div>
        )}

        {/* Step 3: Due Date & File Upload */}
        {currentStep === Step.DATES_FILES && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Due Date</label>
              <input
                type="date"
                className="border p-2 w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Attach PDF / docs (multiple)
              </label>
              <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Take or Upload Photo (mobile)
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files)}
              />
              <p className="text-sm text-gray-500 mt-1">
                On mobile, this should open the camera; on desktop, a file dialog.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === Step.REVIEW_SUBMIT && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Status</label>
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
              <label className="block mb-1 font-medium">Importance</label>
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
            <p className="text-gray-700">
              <strong>Summary:</strong> You are about to create an RFI with:
            </p>
            <ul className="list-disc ml-5 text-gray-700">
              <li>Subject: {subject}</li>
              <li>Description: {question}</li>
              <li>Assigned To: {assignedTo}</li>
              <li>Distribution: {distributionList}</li>
              <li>Due Date: {dueDate}</li>
              <li>Status: {status}</li>
              <li>Importance: {importance}</li>
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

          {currentStep !== Step.SUBJECT_QUESTION && (
            <button
              type="button"
              onClick={prevStep}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back
            </button>
          )}

          {currentStep !== Step.REVIEW_SUBMIT && (
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
              {loading ? "Creating..." : "Submit RFI"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
