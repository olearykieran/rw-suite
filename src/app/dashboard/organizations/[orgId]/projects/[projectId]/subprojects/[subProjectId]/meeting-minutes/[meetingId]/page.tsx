"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchMeeting,
  updateMeeting,
  uploadMeetingAttachment,
  MeetingMinutesDoc,
  Attendee,
  ActionItem,
} from "@/lib/services/MeetingMinutesService";

// PDF generator (pdfmake)
import {
  generateMeetingMinutesPDF,
  MeetingPDFData,
} from "@/lib/services/MeetingPDFGenerator";

// DOCX generator (docx)
import {
  generateMeetingMinutesDoc,
  MeetingDocData,
} from "@/lib/services/MeetingDocGenerator";

/** Convert <input type="datetime-local" /> => Date or null */
function parseDateTime(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert Date => "YYYY-MM-DDTHH:mm" for <input type="datetime-local" /> */
function formatDateTime(d: any): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mn = String(dt.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${hh}:${mn}`;
}

export default function MeetingDetailPage() {
  const { orgId, projectId, subProjectId, meetingId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    meetingId: string;
  };

  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingMinutesDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");

  // JSON text for attendees & action items
  const [attendeesJSON, setAttendeesJSON] = useState("");
  const [actionItemsJSON, setActionItemsJSON] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // Fade-in
  const [showContent, setShowContent] = useState(false);

  // =========================================
  // 1) Load Meeting
  // =========================================
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !meetingId) return;

        const data = await fetchMeeting(orgId, projectId, subProjectId, meetingId);
        setMeeting(data);

        // Fill local states
        setTitle(data.title || "");
        setPropertyCode((data as any).propertyCode || "");
        setPreparedBy((data as any).preparedBy || "");
        setLocation((data as any).location || "");
        setAgenda(data.agenda || "");
        setNotes(data.notes || "");
        setDate(formatDateTime(data.date));
        setNextMeetingDate(formatDateTime(data.nextMeetingDate));

        // Convert arrays to JSON for editing
        setAttendeesJSON(JSON.stringify(data.attendees || [], null, 2));
        setActionItemsJSON(JSON.stringify(data.actionItems || [], null, 2));
      } catch (err: any) {
        console.error("Fetch meeting error:", err);
        setError("Failed to load meeting.");
      } finally {
        setLoading(false);
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, meetingId]);

  // =========================================
  // 2) Update meeting
  // =========================================
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!meeting) return;

    try {
      const dateObj = parseDateTime(date);
      const nextObj = parseDateTime(nextMeetingDate);

      // Parse Attendees + Action Items from JSON
      let parsedAttendees: Attendee[] = [];
      let parsedActionItems: ActionItem[] = [];
      try {
        parsedAttendees = JSON.parse(attendeesJSON);
      } catch (jsonErr) {
        console.warn("Could not parse attendees JSON:", jsonErr);
      }
      try {
        parsedActionItems = JSON.parse(actionItemsJSON);
      } catch (jsonErr) {
        console.warn("Could not parse actionItems JSON:", jsonErr);
      }

      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        title,
        propertyCode,
        preparedBy,
        location,
        date: dateObj,
        agenda,
        notes,
        nextMeetingDate: nextObj,
        attendees: parsedAttendees,
        actionItems: parsedActionItems,
      });
      alert("Meeting updated!");
    } catch (err: any) {
      console.error("Update meeting error:", err);
      setError("Failed to update meeting record.");
    }
  }

  // =========================================
  // 3) Upload attachments
  // =========================================
  async function handleUpload() {
    if (!meeting || !files || files.length === 0) return;

    try {
      const updatedAttachments = [...(meeting.attachments || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadMeetingAttachment(
          orgId,
          projectId,
          subProjectId,
          meeting.id,
          file
        );
        updatedAttachments.push(url);
      }
      // Update doc
      await updateMeeting(orgId, projectId, subProjectId, meeting.id, {
        attachments: updatedAttachments,
      });
      // Locally update
      setMeeting({ ...meeting, attachments: updatedAttachments });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload meeting attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  // =========================================
  // 4) Download as PDF
  // =========================================
  async function handleDownloadPDF() {
    if (!meeting) return;
    const pdfData: MeetingPDFData = {
      title: meeting.title || "",
      propertyCode: (meeting as any).propertyCode || "",
      date: meeting.date ? meeting.date.toString() : "",
      preparedBy: (meeting as any).preparedBy || "",
      location: (meeting as any).location || "",
      attendees: meeting.attendees || [],
      notes: meeting.notes || "",
      actionItems: meeting.actionItems || [],
      logoUrl:
        "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe",
    };
    generateMeetingMinutesPDF(pdfData);
  }

  // =========================================
  // 5) Download as DOCX
  // =========================================
  async function handleDownloadDoc() {
    if (!meeting) return;

    const docAttendees = (meeting.attendees || []).map((a) => ({
      name: a.name,
      email: a.email,
      phone: a.phone,
      company: a.company,
    }));

    const docActions = (meeting.actionItems || []).map((ai) => ({
      status: ai.status,
      owner: ai.owner,
      open: ai.open,
      notes: ai.notes,
    }));

    const docData: MeetingDocData = {
      title: meeting.title || "",
      propertyCode: (meeting as any).propertyCode || "",
      date: meeting.date ? meeting.date.toString() : "",
      preparedBy: (meeting as any).preparedBy || "",
      location: (meeting as any).location || "",
      attendees: docAttendees,
      notes: meeting.notes || "",
      actionItems: docActions,
    };

    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/rw-project-management.firebasestorage.app/o/rw-logo-title.png?alt=media&token=03a42c6c-980c-4857-ae0d-f84c37baa2fe";
    await generateMeetingMinutesDoc(docData, logoUrl);
  }

  // =========================================
  // Render
  // =========================================
  if (loading) {
    return <div className="p-6 text-sm">Loading Meeting...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!meeting) {
    return <div className="p-6">No Meeting record found.</div>;
  }

  return (
    <PageContainer>
      {/* ===== Top Nav + Title ===== */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/meeting-minutes`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold mt-2">
          Meeting: {meeting.title || "Untitled"}
        </h1>
      </div>

      {/* ===== Edit Form ===== */}
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
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Title
              </label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Property Code */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Property Code
              </label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={propertyCode}
                onChange={(e) => setPropertyCode(e.target.value)}
              />
            </div>

            {/* Prepared By */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Prepared By
              </label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Location
              </label>
              <input
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Date
              </label>
              <input
                type="datetime-local"
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Agenda */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Agenda
              </label>
              <textarea
                rows={2}
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Next Meeting */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Next Meeting Date
              </label>
              <input
                type="datetime-local"
                className="border bg-neutral-300 text-black p-2 w-full rounded"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
              />
            </div>

            {/* Attendees (JSON) */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Attendees (JSON)
              </label>
              <textarea
                rows={4}
                className="border bg-neutral-300 text-black p-2 w-full rounded text-sm"
                value={attendeesJSON}
                onChange={(e) => setAttendeesJSON(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Edit your attendees array in JSON. e.g. [{"{"}
                "name":"Alice","email":"alice@example.com"{"}"} ]
              </p>
            </div>

            {/* Action Items (JSON) */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Action Items (JSON)
              </label>
              <textarea
                rows={4}
                className="border bg-neutral-300 text-black p-2 w-full rounded text-sm"
                value={actionItemsJSON}
                onChange={(e) => setActionItemsJSON(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Edit your action items array in JSON. e.g. [{"{"}"status":"Do
                X","owner":"Bob","open":true{"}"} ]
              </p>
            </div>

            <GrayButton type="submit">Update Meeting</GrayButton>
          </form>
        </Card>
      </div>

      {/* ===== Attachments ===== */}
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
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url.split("/").pop()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500 mt-1">No attachments yet.</p>
          )}

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
              "
            />
            <GrayButton onClick={handleUpload}>Upload</GrayButton>
          </div>
        </Card>
      </div>

      {/* ===== Attendees (Detailed) ===== */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[300ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Attendees (Detailed)</h2>
          {meeting.attendees && meeting.attendees.length > 0 ? (
            <table className="w-full text-sm mt-2 border border-gray-300">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Phone</th>
                  <th className="border px-2 py-1">Company</th>
                </tr>
              </thead>
              <tbody>
                {meeting.attendees.map((a, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{a.name}</td>
                    <td className="border px-2 py-1">
                      <a href={`mailto:${a.email}`} className="text-blue-600 underline">
                        {a.email}
                      </a>
                    </td>
                    <td className="border px-2 py-1">{a.phone}</td>
                    <td className="border px-2 py-1">{a.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-500 mt-1">No attendee info.</p>
          )}
        </Card>
      </div>

      {/* ===== Action Items ===== */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[400ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <h2 className="text-lg font-semibold">Action Items</h2>
          {meeting.actionItems && meeting.actionItems.length > 0 ? (
            <table className="w-full text-sm mt-2 border border-gray-300">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="border px-2 py-1">Status/To Do</th>
                  <th className="border px-2 py-1">Owner</th>
                  <th className="border px-2 py-1">Open?</th>
                  <th className="border px-2 py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {meeting.actionItems.map((ai, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{ai.status}</td>
                    <td className="border px-2 py-1">{ai.owner}</td>
                    <td className="border px-2 py-1">{ai.open ? "Open" : "Closed"}</td>
                    <td className="border px-2 py-1">{ai.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-500 mt-1">No action items found.</p>
          )}
        </Card>
      </div>

      {/* ===== Raw JSON (optional) ===== */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[500ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-semibold mb-1">
              Show Full JSON Data
            </summary>
            <pre className="text-xs bg-gray-200 p-2 overflow-x-auto mt-2">
              {JSON.stringify(meeting, null, 2)}
            </pre>
          </details>
        </Card>
      </div>

      {/* ===== Download Buttons ===== */}
      <div className="mt-4 flex items-center gap-2">
        <GrayButton onClick={handleDownloadPDF}>Download as PDF</GrayButton>
        <GrayButton onClick={handleDownloadDoc}>Download as DOCX</GrayButton>
      </div>
    </PageContainer>
  );
}
