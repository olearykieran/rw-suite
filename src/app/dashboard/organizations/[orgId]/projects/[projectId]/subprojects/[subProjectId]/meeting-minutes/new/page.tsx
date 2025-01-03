// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/meeting-minutes/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

      // Convert comma-separated attendees to array
      const attArr = attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      // 1) Create the meeting doc
      const meetingId = await createMeeting(orgId, projectId, subProjectId, {
        title,
        date: dateObj,
        attendees: attArr,
        agenda,
        notes,
        nextMeetingDate: nextObj,
      });

      // 2) If files exist, upload them and update doc with attachments
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
        if (uploadedUrls.length > 0) {
          await updateMeeting(orgId, projectId, subProjectId, meetingId, {
            attachments: uploadedUrls,
          });
        }
      }

      // 3) Redirect
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

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`
    );
  }

  return (
    <PageContainer>
      {/* Top bar: Title + Cancel */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Meeting Minutes</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
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
            <label className="block font-medium mb-1">Attendees (comma-separated)</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="Alice, Bob, Charlie"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="block font-medium mb-1">Agenda</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
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
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
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
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
            />
          </div>

          {/* Attachments */}
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
                dark:file:bg-gray-700 dark:file:text-white
                dark:hover:file:bg-gray-600
              "
            />
            <p className="text-sm">
              Add PDFs, images, or other relevant docs for the meeting.
            </p>
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Meeting"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
