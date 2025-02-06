"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchDailyReport,
  updateDailyReport,
  uploadDailyReportAttachment,
  DailyReportDoc,
} from "@/lib/services/DailyReportService";

/**
 * The updated DailyReportDetailPage always shows the back link,
 * and uses separate conditionals for loading, error, or no doc found.
 */
export default function DailyReportDetailPage() {
  const { orgId, projectId, subProjectId, dailyReportId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    dailyReportId: string;
  };

  const [report, setReport] = useState<DailyReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Local states for the form
  const [date, setDate] = useState("");
  const [weatherNote, setWeatherNote] = useState("");
  const [location, setLocation] = useState("");
  const [incidents, setIncidents] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [delays, setDelays] = useState("");

  // For attachments
  const [files, setFiles] = useState<FileList | null>(null);

  // For fade-in animation
  const [showContent, setShowContent] = useState(false);

  // 1. Load from Firestore
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId || !dailyReportId) return;

        const rep = await fetchDailyReport(orgId, projectId, subProjectId, dailyReportId);
        setReport(rep);

        // Fill local states
        setDate(rep.date || "");
        setWeatherNote(rep.weatherNote || "");
        setLocation(rep.location || "");
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
        setReport(null);
      } finally {
        setLoading(false);
        // Trigger fade-in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, dailyReportId]);

  // 2. Update doc
  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!report) return; // just a safeguard

    // parse incidents by line
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

  // 3. Upload attachments
  async function handleUpload() {
    if (!report || !files || files.length === 0) return;
    try {
      const updatedAtt = [...(report.attachments || [])];
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

      // Locally update
      setReport({ ...report, attachments: updatedAtt });
      setFiles(null);
      alert("Attachments uploaded!");
    } catch (err: any) {
      console.error("Upload attachments error:", err);
      setError("Failed to upload attachments.");
    }
  }

  // ---------- RENDER ----------
  return (
    <PageContainer>
      {/* 
        Back link is always shown, even if loading or there's no doc 
        => user can always navigate back 
      */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`}
          className="
             font-medium text-blue-600 underline
            hover:text-blue-700 dark:text-blue-400
            dark:hover:text-blue-300 transition-colors
          "
        >
          &larr; Back to Daily Reports
        </Link>
      </div>

      {/* If loading => show loading text */}
      {loading && <div className="p-6 ">Loading daily report...</div>}

      {/* If error => show error text (still keeps back link above) */}
      {error && <div className="p-6 text-red-600">{error}</div>}

      {/* If no doc found => show fallback */}
      {!loading && !report && !error && <div className="p-6">No daily report found.</div>}

      {/* If we do have a valid doc => show the main content */}
      {report && !error && (
        <>
          {/* Section #2: Main Editing Card */}
          <div
            className={`
              opacity-0 transition-all duration-500 ease-out delay-[100ms]
              ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
            `}
          >
            <Card>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block  font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block  font-medium mb-1">Location</label>
                  <input
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block  font-medium mb-1">Weather Note</label>
                  <input
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    value={weatherNote}
                    onChange={(e) => setWeatherNote(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block  font-medium mb-1">
                    Incidents (one per line)
                  </label>
                  <textarea
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    rows={3}
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block  font-medium mb-1">Progress Notes</label>
                  <textarea
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    rows={3}
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block  font-medium mb-1">Delays</label>
                  <textarea
                    className="
                      border p-2 w-full rounded
                      bg-white dark:bg-neutral-800 dark:text-white
                    "
                    rows={2}
                    value={delays}
                    onChange={(e) => setDelays(e.target.value)}
                  />
                </div>

                <GrayButton type="submit">Update Report</GrayButton>
              </form>
            </Card>
          </div>

          {/* Section #3: Attachments */}
          <div
            className={`
              opacity-0 transition-all duration-500 ease-out delay-[200ms]
              ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
            `}
          >
            <Card>
              <h2 className="text-lg font-semibold">Attachments</h2>
              {report.attachments && report.attachments.length > 0 ? (
                <ul className="list-disc ml-5  mt-2">
                  {report.attachments.map((url, i) => (
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
                <p className=" mt-1">No attachments yet.</p>
              )}

              {/* Upload new files */}
              <div className="mt-4 space-y-2">
                <label className="block  font-medium">Upload Files</label>
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
        </>
      )}
    </PageContainer>
  );
}
