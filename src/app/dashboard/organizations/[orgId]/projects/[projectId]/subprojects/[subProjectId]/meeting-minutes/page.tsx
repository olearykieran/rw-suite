// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchAllMeetings,
  MeetingMinutesDoc,
  deleteMeeting,
} from "@/lib/services/MeetingMinutesService";

export default function MeetingMinutesListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [meetings, setMeetings] = useState<MeetingMinutesDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // (Optional) Pagination/filter states here

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllMeetings(orgId, projectId, subProjectId);
        setMeetings(data);
      } catch (err: any) {
        console.error("Fetch meetings error:", err);
        setError("Failed to load meetings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(mid: string) {
    try {
      await deleteMeeting(orgId, projectId, subProjectId, mid);
      setMeetings((prev) => prev.filter((m) => m.id !== mid));
    } catch (err: any) {
      console.error("Delete meeting error:", err);
      setError("Failed to delete meeting record.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading meeting minutes...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
          className="
            text-sm font-medium text-blue-600 underline 
            hover:text-blue-700 dark:text-blue-400 
            dark:hover:text-blue-300 transition-colors
          "
        >
          &larr; Back to Sub-Project
        </Link>
      </div>

      {/* Title + Create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">Meeting Minutes</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/new`}
        >
          <GrayButton>Create Meeting</GrayButton>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No meeting records yet. Create one!
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {meetings.map((m) => (
            <Card key={m.id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  {m.title || "Untitled"}{" "}
                  {m.date ? `(${new Date(m.date).toLocaleDateString()})` : ""}
                </p>
                <p className="text-sm">Attendees: {m.attendees?.join(", ") || "None"}</p>
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/${m.id}`}
                  className="
                    text-blue-600 underline text-sm
                    hover:text-blue-700 dark:text-blue-400
                    dark:hover:text-blue-300
                  "
                >
                  View
                </Link>
                <GrayButton
                  onClick={() => handleDelete(m.id)}
                  className="text-xs bg-red-600 hover:bg-red-700"
                >
                  Delete
                </GrayButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* (Optional) Add pagination or filtering logic here */}
    </PageContainer>
  );
}
