// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

  if (loading) return <div className="p-4">Loading meeting minutes...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Subproject
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meeting Minutes</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Meeting
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p>No meeting records yet. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => (
            <li
              key={m.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  {m.title || "Untitled"}{" "}
                  {m.date ? `(${new Date(m.date).toLocaleDateString()})` : ""}
                </p>
                <p className="text-sm text-gray-600">
                  Attendees: {m.attendees?.join(", ") || "None"}
                </p>
              </div>

              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes/${m.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-red-600 underline text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
