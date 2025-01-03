// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/daily-reports/new/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { createDailyReport, getWeatherNote } from "@/lib/services/DailyReportService";

export default function NewDailyReportPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  // Form states
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
      // If user wants auto weather, fetch from external service
      let finalWeather = weatherNote;
      if (autoWeather && location) {
        finalWeather = await getWeatherNote(location);
      }

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

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/daily-reports`
    );
  }

  return (
    <PageContainer>
      {/* Page title + Cancel */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Daily Report</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-medium mb-1">Location (optional)</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="e.g. jobsite address"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Auto weather? */}
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

          {/* Weather Note (only if not auto) */}
          {!autoWeather && (
            <div>
              <label className="block font-medium mb-1">Weather Note</label>
              <input
                className="
                  border p-2 w-full rounded
                  bg-white dark:bg-neutral-800 dark:text-white
                "
                placeholder="Sunny, 75F"
                value={weatherNote}
                onChange={(e) => setWeatherNote(e.target.value)}
              />
            </div>
          )}

          {/* Incidents */}
          <div>
            <label className="block font-medium mb-1">Incidents (one per line)</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              placeholder="Incident 1&#10;Incident 2..."
              value={incidents}
              onChange={(e) => setIncidents(e.target.value)}
            />
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block font-medium mb-1">Progress Notes</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              placeholder="What was accomplished this day..."
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
            />
          </div>

          {/* Delays */}
          <div>
            <label className="block font-medium mb-1">Delays</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={2}
              placeholder="Any reason for delays..."
              value={delays}
              onChange={(e) => setDelays(e.target.value)}
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Report"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
