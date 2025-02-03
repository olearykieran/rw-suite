"use client";

import { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSiteVisit } from "@/lib/services/SiteVisitService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

export default function NewSiteVisitPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [visitDate, setVisitDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [audioFiles, setAudioFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const participantsArray = participants
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      await createSiteVisit(orgId, projectId, subProjectId, {
        visitDate,
        participants: participantsArray,
        notes,
        files,
        audioFiles,
      });
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits`
      );
    } catch (err: any) {
      setError(err.message || "Failed to create site visit");
      console.error(err);
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits`
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Create New Site Visit</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>
      {error && <p className="text-red-600 bg-red-50 p-2 rounded mb-4">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-sm">Visit Date</label>
            <input
              type="date"
              className="border p-2 rounded w-full bg-neutral-300 text-black"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">
              Participants (comma separated)
            </label>
            <input
              type="text"
              className="border p-2 rounded w-full bg-neutral-300 text-black"
              placeholder="John Doe, Jane Smith"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Notes</label>
            <textarea
              className="border p-2 rounded w-full bg-neutral-300 text-black"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">
              Photos (capture or upload)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={(e) => setFiles(e.target.files)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">
              Voice Notes (record or upload)
            </label>
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => setAudioFiles(e.target.files)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400"
            />
          </div>
          <div className="flex gap-4">
            <GrayButton type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Site Visit"}
            </GrayButton>
            <GrayButton type="button" onClick={handleCancel}>
              Cancel
            </GrayButton>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}
