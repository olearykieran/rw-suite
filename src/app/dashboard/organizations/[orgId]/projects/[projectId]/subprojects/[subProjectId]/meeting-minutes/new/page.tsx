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
  Attendee,
  ActionItem,
} from "@/lib/services/MeetingMinutesService";

/**
 * Attempt to parse date from string
 */
function tryParseDate(raw: string): Date | null {
  if (!raw.trim()) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Basic fields
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");

  // We store attendees & action items as JSON text
  const [attendeesJSON, setAttendeesJSON] = useState("[]");
  const [actionItemsJSON, setActionItemsJSON] = useState("[]");

  // For the raw summary for ChatGPT
  const [rawSummary, setRawSummary] = useState("");

  // File attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // UI states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  // ===========================
  // 1) "Parse with ChatGPT"
  // ===========================
  async function handleParseAI() {
    setParsing(true);
    setError("");

    try {
      if (!rawSummary.trim()) {
        setError("Please paste your raw meeting summary first.");
        setParsing(false);
        return;
      }

      const res = await fetch("/api/parse-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSummary }),
      });

      if (!res.ok) {
        throw new Error(`Parse failed, status ${res.status}`);
      }

      const { data } = await res.json();
      if (!data) {
        throw new Error("No data returned from ChatGPT");
      }

      // data => { title, date, attendees: [...], agenda, notes, nextMeetingDate, actionItems: [...] }
      setTitle(data.title || "");
      setAgenda(data.agenda || "");
      setNotes(data.notes || "");

      // date
      if (data.date) {
        const d = tryParseDate(data.date);
        if (d) {
          const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDate(localStr);
        }
      }

      // nextMeetingDate
      if (data.nextMeetingDate) {
        const nd = tryParseDate(data.nextMeetingDate);
        if (nd) {
          const localStr = new Date(nd.getTime() - nd.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setNextMeetingDate(localStr);
        }
      }

      // attendees => array of { name, email, phone, company }
      if (Array.isArray(data.attendees)) {
        setAttendeesJSON(JSON.stringify(data.attendees, null, 2));
      }

      // actionItems => array of { status, owner, open, notes }
      if (Array.isArray(data.actionItems)) {
        setActionItemsJSON(JSON.stringify(data.actionItems, null, 2));
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message || "Failed to parse with ChatGPT");
    } finally {
      setParsing(false);
    }
  }

  // ===========================
  // 2) "Create Meeting"
  // ===========================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // parse date
      const dateObj = tryParseDate(date) || null;
      const nextObj = tryParseDate(nextMeetingDate) || null;

      let attendeesArr: Attendee[] = [];
      let actionItemsArr: ActionItem[] = [];

      // parse attendees from JSON
      try {
        attendeesArr = JSON.parse(attendeesJSON);
      } catch (jsonErr) {
        console.warn("Could not parse attendees JSON:", jsonErr);
        attendeesArr = [];
      }

      // parse action items from JSON
      try {
        actionItemsArr = JSON.parse(actionItemsJSON);
      } catch (jsonErr) {
        console.warn("Could not parse actionItems JSON:", jsonErr);
        actionItemsArr = [];
      }

      // create doc
      const meetingId = await createMeeting(orgId, projectId, subProjectId, {
        title,
        date: dateObj,
        agenda,
        notes,
        nextMeetingDate: nextObj,
        attendees: attendeesArr,
        actionItems: actionItemsArr,
      });

      // attachments
      if (files && files.length > 0) {
        const uploaded: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await uploadMeetingAttachment(
            orgId,
            projectId,
            subProjectId,
            meetingId,
            file
          );
          uploaded.push(url);
        }
        if (uploaded.length > 0) {
          await updateMeeting(orgId, projectId, subProjectId, meetingId, {
            attachments: uploaded,
          });
        }
      }

      // redirect
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

  // ===========================
  // Cancel
  // ===========================
  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`
    );
  }

  // ===========================
  // Render
  // ===========================
  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Meeting Minutes</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        {/* RAW SUMMARY + AI PARSE */}
        <div className="mb-6">
          <label className="block font-medium mb-1">Paste Raw Meeting Summary</label>
          <textarea
            className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
            rows={5}
            placeholder="Paste entire transcript or summary..."
            value={rawSummary}
            onChange={(e) => setRawSummary(e.target.value)}
          />
          <GrayButton onClick={handleParseAI} disabled={parsing}>
            {parsing ? "Parsing..." : "Parse with ChatGPT"}
          </GrayButton>
          <p className="text-xs text-gray-500 mt-1">
            This calls our AI endpoint to auto-fill the fields below.
          </p>
        </div>

        {/* MAIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
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
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="block font-medium mb-1">Agenda</label>
            <textarea
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium mb-1">Meeting Notes</label>
            <textarea
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Next Meeting Date */}
          <div>
            <label className="block font-medium mb-1">Next Meeting Date (optional)</label>
            <input
              type="datetime-local"
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
            />
          </div>

          {/* Attendees JSON */}
          <div>
            <label className="block font-medium mb-1">Attendees (JSON)</label>
            <textarea
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              rows={4}
              value={attendeesJSON}
              onChange={(e) => setAttendeesJSON(e.target.value)}
              placeholder={`Example:
[
  {
    "name": "Alice",
    "email": "alice@example.com",
    "phone": "555-111-2222",
    "company": "ACME"
  },
  ...
]
`}
            />
          </div>

          {/* Action Items JSON */}
          <div>
            <label className="block font-medium mb-1">Action Items (JSON)</label>
            <textarea
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              rows={4}
              value={actionItemsJSON}
              onChange={(e) => setActionItemsJSON(e.target.value)}
              placeholder={`Example:
[
  {
    "status": "Remove pews",
    "owner": "Kieran",
    "open": true,
    "notes": "Store them in the basement"
  },
  ...
]
`}
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
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Meeting"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
