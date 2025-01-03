// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/[meetingId]/page.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

  // 1. Load the doc
  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId || !meetingId) return;
        setLoading(true);
        const data = await fetchMeeting(orgId, projectId, subProjectId, meetingId);
        setMeeting(data);

        // populate local states
        setTitle(data.title || "");
        setAgenda(data.agenda || "");
        setNotes(data.notes || "");
        setAttendees(data.attendees?.join(", ") || "");
        if (data.date) {
          setDate(formatDateTime(new Date(data.date)));
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

  // helper to convert Date -> input value
  function formatDateTime(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  // 2. Update doc
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!meeting) return;

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

  // 3. Upload attachments
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

  if (loading) {
    return <div className="p-6 text-sm">Loading meeting record...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!meeting) {
    return <div className="p-6">No meeting record found.</div>;
  }

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`}
        className="
          text-sm font-medium text-blue-600 underline
          hover:text-blue-700 dark:text-blue-400
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Meetings
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Meeting: {meeting.title}</h1>
      </div>

      {/* Main details card */}
      <Card>
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="datetime-local"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Attendees (comma-separated)
            </label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-sm font-medium mb-1">Agenda</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Next Meeting */}
          <div>
            <label className="block text-sm font-medium mb-1">Next Meeting Date</label>
            <input
              type="datetime-local"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
            />
          </div>

          <GrayButton type="submit">Update Meeting</GrayButton>
        </form>
      </Card>

      {/* Attachments card */}
      <Card>
        <h2 className="text-lg font-semibold">Attachments</h2>
        {meeting.attachments && meeting.attachments.length > 0 ? (
          <ul className="list-disc ml-5 text-sm mt-2">
            {meeting.attachments.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    text-blue-600 underline
                    hover:text-blue-700
                    dark:text-blue-400 dark:hover:text-blue-300
                  "
                >
                  {url.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm mt-1">No attachments yet.</p>
        )}

        {/* Upload new files */}
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
              dark:file:bg-gray-700 dark:file:text-white
              dark:hover:file:bg-gray-600
            "
          />
          <GrayButton onClick={handleUpload}>Upload</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
