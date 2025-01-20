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

/**
 * Convert "YYYY-MM-DDTHH:MM" from an <input type="datetime-local" />
 * into a valid Date or null if invalid.
 */
function parseDateTime(value: string): Date | null {
  if (!value) return null; // empty => no date
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    // invalid => return null
    return null;
  }
  return d;
}

/**
 * Convert a Date to the <input type="datetime-local" /> string format
 * "YYYY-MM-DDTHH:mm". If the date is null/undefined or invalid, return "".
 */
function formatDateTime(d: any): string {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const yy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const hh = String(dateObj.getHours()).padStart(2, "0");
  const mn = String(dateObj.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${hh}:${mn}`;
}

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

  // local states
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [date, setDate] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // For fade-in
  const [showContent, setShowContent] = useState(false);

  // 1. Load doc
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !meetingId) return;

        const data = await fetchMeeting(orgId, projectId, subProjectId, meetingId);
        setMeeting(data);

        // populate local states
        setTitle(data.title || "");
        setAgenda(data.agenda || "");
        setNotes(data.notes || "");
        setAttendees(data.attendees?.join(", ") || "");

        // format the date/time for <input type="datetime-local" />
        setDate(formatDateTime(data.date));
        setNextMeetingDate(formatDateTime(data.nextMeetingDate));
      } catch (err: any) {
        console.error("Fetch meeting error:", err);
        setError("Failed to load meeting record.");
      } finally {
        setLoading(false);
        // fade-in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, meetingId]);

  // 2. Update doc
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!meeting) return;

    try {
      // parse date/time
      const dateObj = parseDateTime(date);
      const nextObj = parseDateTime(nextMeetingDate);

      // parse attendees
      const attArr = attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        title,
        agenda,
        notes,
        attendees: attArr,
        date: dateObj, // if invalid => null
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
      const updatedAtt = [...(meeting.attachments || [])];
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
      // update doc
      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        attachments: updatedAtt,
      });
      // locally set state
      setMeeting({ ...meeting, attachments: updatedAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload meeting attachment error:", err);
      setError("Failed to upload attachments");
    }
  }

  // ---------- RENDER ----------
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
      {/* === Section #1: Back link + Title === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
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

        <div className="space-y-1 mt-2">
          <h1 className="text-2xl font-bold">Meeting: {meeting.title}</h1>
        </div>
      </div>

      {/* === Section #2: Main details card === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
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
      </div>

      {/* === Section #3: Attachments === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[200ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
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
      </div>
    </PageContainer>
  );
}
