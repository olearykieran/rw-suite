// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/[meetingId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchMeeting,
  updateMeeting,
  uploadMeetingAttachment,
  MeetingMinutesDoc,
} from "@/lib/services/MeetingMinutesService";

export default function MeetingDetailPage() {
  const { orgId, projectId, subProjectId, meetingId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    meetingId: string;
  };

  const [meeting, setMeeting] = useState<MeetingMinutesDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // local states for editing
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [date, setDate] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId || !meetingId) return;
        setLoading(true);
        const data = await fetchMeeting(orgId, projectId, subProjectId, meetingId);
        setMeeting(data);

        // Prefill local states
        setTitle(data.title || "");
        setAgenda(data.agenda || "");
        setNotes(data.notes || "");
        setAttendees(data.attendees?.join(", ") || "");
        if (data.date) {
          // converting Date -> input value (yyyy-MM-ddTHH:mm)
          const dt = new Date(data.date);
          setDate(formatDateTime(dt));
        }
        if (data.nextMeetingDate) {
          setNextMeetingDate(formatDateTime(new Date(data.nextMeetingDate)));
        }
      } catch (err: any) {
        console.error("Fetch meeting error:", err);
        setError("Failed to load meeting record.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, meetingId]);

  function formatDateTime(d: Date): string {
    // example: "2024-10-13T14:30"
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!meeting) return;
    setError("");

    try {
      let dateObj: Date | null = null;
      if (date) dateObj = new Date(date);
      let nextObj: Date | null = null;
      if (nextMeetingDate) nextObj = new Date(nextMeetingDate);

      const attArr = attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        title,
        agenda,
        notes,
        attendees: attArr,
        date: dateObj,
        nextMeetingDate: nextObj,
      });
      alert("Meeting updated!");
    } catch (err: any) {
      console.error("Update meeting error:", err);
      setError("Failed to update meeting record.");
    }
  }

  async function handleUpload() {
    if (!meeting || !files || files.length === 0) return;
    try {
      const updatedAtt = meeting.attachments ? [...meeting.attachments] : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadMeetingAttachment(
          orgId,
          projectId,
          subProjectId,
          meeting.id,
          file
        );
        updatedAtt.push(url);
      }
      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        attachments: updatedAtt,
      });
      setMeeting({ ...meeting, attachments: updatedAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload meeting attachment error:", err);
      setError("Failed to upload attachments");
    }
  }

  if (loading) return <div className="p-4">Loading meeting record...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!meeting) return <div className="p-4">No meeting record found.</div>;

  return (
    <main className="p-4 space-y-4">
      {/* back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`}
        className="text-blue-600 underline"
      >
        &larr; Back to Meetings
      </Link>

      <h1 className="text-2xl font-bold">Meeting: {meeting.title}</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {/* Date */}
        <div>
          <label className="block font-medium mb-1">Date</label>
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
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
          />
        </div>

        {/* Agenda */}
        <div>
          <label className="block font-medium mb-1">Agenda</label>
          <textarea
            className="border p-2 w-full"
            rows={2}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium mb-1">Notes</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Next Meeting */}
        <div>
          <label className="block font-medium mb-1">Next Meeting Date</label>
          <input
            type="datetime-local"
            className="border p-2 w-full"
            value={nextMeetingDate}
            onChange={(e) => setNextMeetingDate(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Update Meeting
        </button>
      </form>

      {/* Attachments */}
      <div className="border-t pt-4 space-y-4">
        <h2 className="text-xl font-semibold">Attachments</h2>
        {meeting.attachments && meeting.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {meeting.attachments.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No attachments yet.</p>
        )}

        <div>
          <label className="block font-medium mb-1">Upload Additional Docs</label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
          >
            Upload
          </button>
        </div>
      </div>
    </main>
  );
}
