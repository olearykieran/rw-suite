// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createMeeting,
  uploadMeetingAttachment,
  updateMeeting,
} from "@/lib/services/MeetingMinutesService";

export default function NewMeetingPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Form states
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");

  // For handling file uploads
  const [files, setFiles] = useState<FileList | null>(null);

  // Error/loading
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert form strings to dates if present
      let dateObj: Date | null = null;
      if (date) dateObj = new Date(date);

      let nextObj: Date | null = null;
      if (nextMeetingDate) nextObj = new Date(nextMeetingDate);

      // Convert comma-separated attendees to string[]
      const attArr = attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      // 1) Create the meeting doc (to get the new doc ID)
      const meetingId = await createMeeting(orgId, projectId, subProjectId, {
        title,
        date: dateObj,
        attendees: attArr,
        agenda,
        notes,
        nextMeetingDate: nextObj,
      });

      // 2) If files exist, upload them one by one, gather URLs, then update the doc's attachments array
      if (files && files.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await uploadMeetingAttachment(
            orgId,
            projectId,
            subProjectId,
            meetingId,
            file
          );
          uploadedUrls.push(url);
        }

        // Update the new meeting doc with the attachments array
        if (uploadedUrls.length > 0) {
          await updateMeeting(orgId, projectId, subProjectId, meetingId, {
            attachments: uploadedUrls,
          });
        }
      }

      // 3) Redirect back to the meeting-minutes list
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`
      );
    } catch (err: any) {
      console.error("Create meeting error:", err);
      setError(err.message || "Failed to create meeting record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`}
        className="text-blue-600 underline"
      >
        &larr; Back to Meeting Minutes
      </Link>

      <h1 className="text-2xl font-bold">Create Meeting Minutes</h1>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full"
            placeholder="Project Coordination Meeting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Meeting Date */}
        <div>
          <label className="block font-medium mb-1">Date of Meeting</label>
          <input
            type="datetime-local"
            className="border p-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Attendees */}
        <div>
          <label className="block font-medium mb-1">Attendees (comma-separated)</label>
          <input
            className="border p-2 w-full"
            placeholder="Alice, Bob, Charlie"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />
        </div>

        {/* Agenda */}
        <div>
          <label className="block font-medium mb-1">Agenda</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Agenda items..."
          />
        </div>

        {/* Meeting Notes */}
        <div>
          <label className="block font-medium mb-1">Meeting Notes</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting summary, decisions made..."
          />
        </div>

        {/* Next Meeting Date */}
        <div>
          <label className="block font-medium mb-1">Next Meeting Date (optional)</label>
          <input
            type="datetime-local"
            className="border p-2 w-full"
            value={nextMeetingDate}
            onChange={(e) => setNextMeetingDate(e.target.value)}
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block font-medium mb-1">Attachments (optional)</label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          <p className="text-sm text-gray-600">
            Add PDFs, images, or any relevant files for the meeting.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          {loading ? "Creating..." : "Create Meeting"}
        </button>
      </form>
    </main>
  );
}
