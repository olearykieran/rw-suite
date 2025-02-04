"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { createRfi } from "@/lib/services/RfiService";
import { auth } from "@/lib/firebaseConfig";

/**
 * NewRfiPage allows a user to paste a raw RFI summary, parse it using ChatGPT,
 * edit the parsed fields, attach files if necessary, and finally create a new RFI.
 */
export default function NewRfiPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const router = useRouter();

  // Raw summary input to be parsed
  const [rawSummary, setRawSummary] = useState("");

  // RFI fields (parsed and editable)
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [importance, setImportance] = useState("normal");
  const [officialResponse, setOfficialResponse] = useState("");

  // File attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // UI states
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------
  // 1) Parse raw summary using ChatGPT
  // -------------------------------
  async function handleParseAI() {
    setParsing(true);
    setError("");

    try {
      if (!rawSummary.trim()) {
        setError("Please paste your raw RFI summary first.");
        setParsing(false);
        return;
      }

      const res = await fetch("/api/parse-rfi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSummary }),
      });

      if (!res.ok) {
        throw new Error(`Parse failed, status ${res.status}`);
      }

      const { data } = await res.json();
      if (!data) {
        throw new Error("No data returned from ChatGPT");
      }

      // Update form fields with parsed data (provide defaults if missing)
      setSubject(data.subject || "");
      setQuestion(data.question || "");
      setAssignedTo(data.assignedTo || "");
      setDistributionList(
        Array.isArray(data.distributionList) ? data.distributionList.join(", ") : ""
      );
      setDueDate(data.dueDate || "");
      setStatus(data.status || "draft");
      setImportance(data.importance || "normal");
      setOfficialResponse(data.officialResponse || "");
    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message || "Failed to parse with ChatGPT");
    } finally {
      setParsing(false);
    }
  }

  // -------------------------------
  // 2) Create RFI
  // -------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert distribution list input (comma separated) into an array
      const distArray = distributionList
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      // Create the RFI using your existing service
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
        // Pass files to your service if needed (your createRfi function should handle attachments)
        files,
        createdByEmail: auth.currentUser?.email || "",
        // Optionally include officialResponse if you want to prefill that field.
      });

      // Redirect to the RFI list page after creation
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`
      );
    } catch (err: any) {
      console.error("Create RFI error:", err);
      setError(err.message || "Failed to create RFI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      {/* Page title and navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New RFI</h1>
        <GrayButton
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/rfis`
            )
          }
        >
          Cancel
        </GrayButton>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      <Card className="mt-4">
        {/* RAW SUMMARY + AI PARSE */}
        <div className="mb-6">
          <label className="block font-medium mb-1">Paste Raw RFI Summary</label>
          <textarea
            className="border p-2 w-full rounded bg-white text-black"
            rows={5}
            placeholder="Paste the raw summary of the RFI here..."
            value={rawSummary}
            onChange={(e) => setRawSummary(e.target.value)}
          />
          <GrayButton onClick={handleParseAI} disabled={parsing} className="mt-2">
            {parsing ? "Parsing..." : "Parse with ChatGPT"}
          </GrayButton>
          <p className="text-xs text-gray-500 mt-1">
            This will auto-fill the fields below based on the summary.
          </p>
        </div>

        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block font-medium mb-1">Subject</label>
            <input
              className="border p-2 w-full rounded bg-white text-black"
              placeholder="RFI Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Question / Description */}
          <div>
            <label className="block font-medium mb-1">Question / Description</label>
            <textarea
              className="border p-2 w-full rounded bg-white text-black"
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe the RFI in detail..."
              required
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block font-medium mb-1">Assigned To</label>
            <input
              className="border p-2 w-full rounded bg-white text-black"
              placeholder="user@example.com"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>

          {/* Distribution List */}
          <div>
            <label className="block font-medium mb-1">
              Distribution List (comma-separated)
            </label>
            <input
              className="border p-2 w-full rounded bg-white text-black"
              placeholder="user1@example.com, user2@example.com"
              value={distributionList}
              onChange={(e) => setDistributionList(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block font-medium mb-1">Due Date</label>
            <input
              type="date"
              className="border p-2 w-full rounded bg-white text-black"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              className="border p-2 w-full rounded bg-white text-black"
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
          <div>
            <label className="block font-medium mb-1">Importance</label>
            <select
              className="border p-2 w-full rounded bg-white text-black"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Official Response */}
          <div>
            <label className="block font-medium mb-1">Official Response</label>
            <textarea
              className="border p-2 w-full rounded bg-white text-black"
              rows={3}
              value={officialResponse}
              onChange={(e) => setOfficialResponse(e.target.value)}
              placeholder="Any official response details (if applicable)..."
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block font-medium mb-1">Attachments (optional)</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="
                file:mr-2 file:py-2 file:px-3
                file:border-0 file:rounded
                file:bg-gray-300 file:text-black
                hover:file:bg-gray-400
              "
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create RFI"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
