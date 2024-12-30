// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/daily-reports/new/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createDailyReport, getWeatherNote } from "@/lib/services/DailyReportService";

export default function NewDailyReportPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [autoWeather, setAutoWeather] = useState(false);
  const [weatherNote, setWeatherNote] = useState("");
  const [incidents, setIncidents] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [delays, setDelays] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let finalWeather = weatherNote;
      if (autoWeather && location) {
        // If user wants auto weather, fetch
        finalWeather = await getWeatherNote(location);
      }

      // parse incidents by line
      const incidentArr = incidents
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      await createDailyReport(orgId, projectId, subProjectId, {
        date,
        location,
        weatherNote: finalWeather,
        incidents: incidentArr,
        progressNotes,
        delays,
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`
      );
    } catch (err: any) {
      console.error("Create daily report error:", err);
      setError(err.message || "Failed to create daily report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`}
        className="text-blue-600 underline"
      >
        &larr; Back to Daily Reports
      </Link>

      <h1 className="text-2xl font-bold">Create Daily Report</h1>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Date</label>
          <input
            type="date"
            className="border p-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Location (optional)</label>
          <input
            className="border p-2 w-full"
            placeholder="e.g. jobsite address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoWeather"
            checked={autoWeather}
            onChange={(e) => setAutoWeather(e.target.checked)}
          />
          <label htmlFor="autoWeather" className="text-sm">
            Auto-Fetch Weather
          </label>
        </div>

        {!autoWeather && (
          <div>
            <label className="block font-medium mb-1">Weather Note</label>
            <input
              className="border p-2 w-full"
              placeholder="Sunny, 75F"
              value={weatherNote}
              onChange={(e) => setWeatherNote(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block font-medium mb-1">Incidents (one per line)</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            placeholder="Incident 1&#10;Incident 2..."
            value={incidents}
            onChange={(e) => setIncidents(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Progress Notes</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            placeholder="What was accomplished this day..."
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Delays</label>
          <textarea
            className="border p-2 w-full"
            rows={2}
            placeholder="Any reason for delays..."
            value={delays}
            onChange={(e) => setDelays(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Report"}
        </button>
      </form>
    </main>
  );
}
