// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/daily-reports/[reportId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchDailyReport,
  updateDailyReport,
  uploadDailyReportAttachment,
  DailyReportDoc,
} from "@/lib/services/DailyReportService";

export default function DailyReportDetailPage() {
  const { orgId, projectId, subProjectId, reportId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    reportId: string;
  };

  const [report, setReport] = useState<DailyReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local states
  const [date, setDate] = useState("");
  const [weatherNote, setWeatherNote] = useState("");
  const [location, setLocation] = useState("");
  const [incidents, setIncidents] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [delays, setDelays] = useState("");

  // Attachments
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId || !reportId) return;
        setLoading(true);
        const rep = await fetchDailyReport(orgId, projectId, subProjectId, reportId);
        setReport(rep);

        setDate(rep.date || "");
        setWeatherNote(rep.weatherNote || "");
        setLocation(rep.location || "");

        // incidents => join with newlines
        if (rep.incidents && rep.incidents.length > 0) {
          setIncidents(rep.incidents.join("\n"));
        } else {
          setIncidents("");
        }

        setProgressNotes(rep.progressNotes || "");
        setDelays(rep.delays || "");
      } catch (err: any) {
        console.error("Fetch daily report error:", err);
        setError("Failed to load daily report.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, reportId]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!report) return;
    setError("");

    // parse incidents
    const incArr = incidents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      await updateDailyReport(orgId, projectId, subProjectId, report.id, {
        date,
        weatherNote,
        location,
        incidents: incArr,
        progressNotes,
        delays,
      });
      alert("Daily report updated!");
    } catch (err: any) {
      console.error("Update daily report error:", err);
      setError("Failed to update daily report.");
    }
  }

  async function handleUpload() {
    if (!report || !files || files.length === 0) return;
    try {
      const updatedAtt = report.attachments ? [...report.attachments] : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadDailyReportAttachment(
          orgId,
          projectId,
          subProjectId,
          report.id,
          file
        );
        updatedAtt.push(url);
      }
      await updateDailyReport(orgId, projectId, subProjectId, report.id, {
        attachments: updatedAtt,
      });
      setReport({ ...report, attachments: updatedAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  if (loading) return <div className="p-4">Loading daily report...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!report) return <div className="p-4">No daily report found.</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`}
        className="text-blue-600 underline"
      >
        &larr; Back to Daily Reports
      </Link>

      <h1 className="text-2xl font-bold">Daily Report for {report.date}</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Date</label>
          <input
            type="date"
            className="border p-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Location</label>
          <input
            className="border p-2 w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Weather Note</label>
          <input
            className="border p-2 w-full"
            value={weatherNote}
            onChange={(e) => setWeatherNote(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Incidents (one per line)</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={incidents}
            onChange={(e) => setIncidents(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Progress Notes</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Delays</label>
          <textarea
            className="border p-2 w-full"
            rows={2}
            value={delays}
            onChange={(e) => setDelays(e.target.value)}
          />
        </div>

        <button className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800">
          Update Report
        </button>
      </form>

      {/* Attachments */}
      <div className="border-t pt-4 space-y-4">
        <h2 className="text-xl font-semibold">Attachments</h2>
        {report.attachments && report.attachments.length > 0 ? (
          <ul className="list-disc ml-5">
            {report.attachments.map((url, i) => (
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
          <label className="block font-medium mb-1">Upload Attachments</label>
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
