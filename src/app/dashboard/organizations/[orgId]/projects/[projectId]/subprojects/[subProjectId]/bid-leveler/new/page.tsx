"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  createBid,
  uploadBidAttachment,
  updateBid,
  BidDoc,
} from "@/lib/services/BidLevelerService";

/**
 * parseDate(value: string) => tries to parse YYYY-MM-DD or YYYY-MM-DDTHH:mm
 */
function parseDate(value: string): Date | null {
  if (!value) return null;
  // If user typed only "YYYY-MM-DD" => we can add "T00:00"
  let dateStr = value;
  if (dateStr.length === 10 && !dateStr.includes("T")) {
    dateStr += "T00:00";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return null;
  }
  return d;
}

export default function NewBidPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Form fields
  const [trade, setTrade] = useState("");
  const [contractor, setContractor] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [exclusions, setExclusions] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler`
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const dateObj = parseDate(submissionDate);

      const newBidId = await createBid(orgId, projectId, subProjectId, {
        trade,
        contractor,
        bidAmount: bidAmount ? parseFloat(bidAmount) : undefined,
        submissionDate: dateObj || null,
        notes,
        scopeOfWork,
        exclusions,
        attachments: [],
      });

      // If we have attachments, upload them
      if (files && files.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await uploadBidAttachment(
            orgId,
            projectId,
            subProjectId,
            newBidId,
            file
          );
          uploadedUrls.push(url);
        }

        // Update the newly created doc with attachment URLs
        if (uploadedUrls.length > 0) {
          await updateBid(orgId, projectId, subProjectId, newBidId, {
            attachments: uploadedUrls,
          });
        }
      }

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler`
      );
    } catch (err: any) {
      console.error("Error creating bid:", err);
      setError("Failed to create bid");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Create New Bid</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trade */}
          <div>
            <label className="block  font-medium mb-1">Trade</label>
            <input
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              placeholder="e.g. Plumbing"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              required
            />
          </div>

          {/* Contractor */}
          <div>
            <label className="block  font-medium mb-1">Contractor</label>
            <input
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              placeholder="e.g. P.H. Works Inc."
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              required
            />
          </div>

          {/* Bid Amount */}
          <div>
            <label className="block  font-medium mb-1">Bid Amount</label>
            <input
              type="number"
              step="0.01"
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              placeholder="e.g. 100000"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
          </div>

          {/* Submission Date */}
          <div>
            <label className="block  font-medium mb-1">Submission Date</label>
            <input
              type="datetime-local"
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
            />
            <p className="text-xs text-neutral-500">
              Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block  font-medium mb-1">Notes / Comments</label>
            <textarea
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              rows={3}
              placeholder="Excludes permits..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Scope of Work */}
          <div>
            <label className="block  font-medium mb-1">Scope of Work</label>
            <textarea
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              rows={3}
              placeholder="Plumbing rough-in for floors 1-3, supply lines..."
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
            />
          </div>

          {/* Exclusions */}
          <div>
            <label className="block  font-medium mb-1">Exclusions</label>
            <textarea
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              rows={2}
              placeholder="Testing fees, evening work..."
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block  font-medium">Attachments (PDF, etc.)</label>
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
            {loading ? "Creating..." : "Create Bid"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
