// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/bid-leveler/[bidId]/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchBid,
  updateBid,
  uploadBidAttachment,
  BidDoc,
} from "@/lib/services/BidLevelerService";

/** parseDateTime: parse "YYYY-MM-DDTHH:mm" => Date */
function parseDateTime(value: string): Date | null {
  if (!value) return null;
  // If no "T" is present, append T00:00
  if (!value.includes("T")) {
    value += "T00:00";
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** formatDateTime => "YYYY-MM-DDTHH:mm" for <input type="datetime-local" /> */
function formatDateTime(d: any): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const hours = String(dt.getHours()).padStart(2, "0");
  const mins = String(dt.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export default function BidDetailPage() {
  const { orgId, projectId, subProjectId, bidId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    bidId: string;
  };

  const router = useRouter();

  const [bid, setBid] = useState<BidDoc | null>(null);
  const [trade, setTrade] = useState("");
  const [contractor, setContractor] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // For a simple fade-in effect
  const [showContent, setShowContent] = useState(false);

  // -----------------------------
  // 1) Load existing doc
  // -----------------------------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !bidId) return;

        const data = await fetchBid(orgId, projectId, subProjectId, bidId);
        setBid(data);

        // Prefill local state
        setTrade(data.trade || "");
        setContractor(data.contractor || "");
        setBidAmount(data.bidAmount ? String(data.bidAmount) : "");
        setNotes(data.notes || "");
        setScopeOfWork(data.scopeOfWork || "");
        setExclusions(data.exclusions || "");

        // Convert Date => input's datetime-local
        setSubmissionDate(formatDateTime(data.submissionDate));
      } catch (err: any) {
        console.error("Fetch bid error:", err);
        setError("Failed to load bid.");
      } finally {
        setLoading(false);
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, bidId]);

  // -----------------------------
  // 2) Update doc
  // -----------------------------
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!bid) return;

    try {
      const dateObj = parseDateTime(submissionDate);

      const updates: Partial<BidDoc> = {
        trade,
        contractor,
        bidAmount: bidAmount ? parseFloat(bidAmount) : undefined,
        notes,
        scopeOfWork,
        exclusions,
        submissionDate: dateObj,
      };

      await updateBid(orgId, projectId, subProjectId, bid.id, updates);
      alert("Bid updated!");
    } catch (err) {
      console.error("Update bid error:", err);
      setError("Failed to update bid.");
    }
  }

  // -----------------------------
  // 3) Upload attachments
  // -----------------------------
  async function handleUpload() {
    if (!bid || !files || files.length === 0) return;
    try {
      const updatedAttachments = [...(bid.attachments || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadBidAttachment(
          orgId,
          projectId,
          subProjectId,
          bid.id,
          file
        );
        updatedAttachments.push(url);
      }
      await updateBid(orgId, projectId, subProjectId, bid.id, {
        attachments: updatedAttachments,
      });
      setBid({ ...bid, attachments: updatedAttachments });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  // -----------------------------
  // Render
  // -----------------------------
  if (loading) return <PageContainer>Loading bid...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;
  if (!bid) return <PageContainer>No Bid record found.</PageContainer>;

  return (
    <PageContainer>
      {/* Top Nav + Title */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold mt-2">
          {bid.trade} - {bid.contractor}
        </h1>
      </div>

      {/* Edit Form */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[100ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <Card>
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* Trade */}
            <div>
              <label className="block text-sm font-medium mb-1">Trade</label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
              />
            </div>

            {/* Contractor */}
            <div>
              <label className="block text-sm font-medium mb-1">Contractor</label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              />
            </div>

            {/* Bid Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">Bid Amount</label>
              <input
                type="number"
                step="0.01"
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>

            {/* Submission Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Submission Date</label>
              <input
                type="datetime-local"
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={3}
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Scope of Work */}
            <div>
              <label className="block text-sm font-medium mb-1">Scope of Work</label>
              <textarea
                rows={2}
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="block text-sm font-medium mb-1">Exclusions</label>
              <textarea
                rows={2}
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
              />
            </div>

            <GrayButton type="submit">Update Bid</GrayButton>
          </form>
        </Card>
      </div>

      {/* Attachments */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[200ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <Card>
          <h2 className="text-lg font-semibold">Attachments</h2>
          {bid.attachments && bid.attachments.length > 0 ? (
            <ul className="list-disc ml-5 text-sm mt-2">
              {bid.attachments.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-500"
                  >
                    {url.split("/").pop()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500 mt-1">No attachments yet.</p>
          )}

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">Upload Files</label>
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
            <GrayButton onClick={handleUpload}>Upload</GrayButton>
          </div>
        </Card>
      </div>

      {/* Buttons to go to parse/confirm/leveling */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[300ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <Card className="space-y-2">
          <div className="flex gap-2">
            <GrayButton
              onClick={() =>
                router.push(
                  `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}/parse`
                )
              }
            >
              Parse Bid Scope
            </GrayButton>

            <GrayButton
              onClick={() =>
                router.push(
                  `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}/confirm`
                )
              }
            >
              Confirm Matches
            </GrayButton>

            <GrayButton
              onClick={() =>
                router.push(
                  `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}/leveling`
                )
              }
            >
              View Leveling
            </GrayButton>
          </div>
        </Card>
      </div>

      {/* Raw JSON */}
      <div
        className={`opacity-0 transition-all duration-500 ease-out delay-[400ms] ${
          showContent ? "opacity-100 translate-y-0" : "translate-y-4"
        }`}
      >
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-semibold mb-1">
              Show Full JSON Data
            </summary>
            <pre className="text-xs bg-gray-200 p-2 overflow-x-auto mt-2">
              {JSON.stringify(bid, null, 2)}
            </pre>
          </details>
        </Card>
      </div>
    </PageContainer>
  );
}
