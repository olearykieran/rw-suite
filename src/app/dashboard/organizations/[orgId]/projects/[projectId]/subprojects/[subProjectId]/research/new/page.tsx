// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/research/new/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { createResearchEntries, ResearchEntry } from "@/lib/services/ResearchService";

/**
 * NewResearchPage allows a user to paste a JSON array of research entries.
 * Each research entry should include:
 *  - title: string
 *  - url: string
 *  - type: string (e.g., "Article", "Social Media", etc.)
 *  - source: string (e.g., "NY Times", "Instagram")
 *  - date: string (ISO date format)
 *  - tags: string[] (an array of tags)
 *  - summary: string
 *
 * Optionally, you can also include:
 *  - author: string (the article's author)
 *  - notes: string (your personal notes or commentary)
 *
 * Example JSON:
 * [
 *   {
 *     "title": "Bathhouse NYC Market Analysis",
 *     "url": "https://www.nytimes.com/2023/02/05/style/bathhouse-nyc.html",
 *     "type": "Article",
 *     "source": "NY Times",
 *     "date": "2023-02-05",
 *     "tags": ["Market Growth", "NYC"],
 *     "summary": "An in-depth analysis of Bathhouse NYC's market potential.",
 *     "author": "John Doe",
 *     "notes": "Key insights for urban wellness trends."
 *   },
 *   {
 *     "title": "Othership Social Media Buzz",
 *     "url": "https://www.othership.com/",
 *     "type": "Website",
 *     "source": "Othership",
 *     "date": "2024-01-05",
 *     "tags": ["Social Media", "Engagement"],
 *     "summary": "Data on Othership's growing social media presence.",
 *     "notes": "Useful for competitor analysis."
 *   }
 * ]
 */
export default function NewResearchPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  // State for the JSON input
  const [jsonInput, setJsonInput] = useState<string>("");
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Handles the form submission by parsing the JSON and saving each research entry.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Parse the JSON input
      const entries: ResearchEntry[] = JSON.parse(jsonInput);

      // Validate that the input is an array
      if (!Array.isArray(entries)) {
        throw new Error("The JSON must be an array of research entries.");
      }

      // Validate that each entry has the required fields.
      for (const entry of entries) {
        if (
          !entry.title ||
          !entry.url ||
          !entry.type ||
          !entry.source ||
          !entry.date ||
          !entry.tags ||
          !entry.summary
        ) {
          throw new Error(
            "Each entry must include title, url, type, source, date, tags, and summary."
          );
        }
      }

      // Save the research entries to Firestore
      await createResearchEntries(orgId, projectId, subProjectId, entries);

      // Redirect to the research entries list page
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/research`
      );
    } catch (err: any) {
      console.error("Error creating research entries:", err);
      setError(err.message || "An error occurred while saving research entries.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Research Sources</h1>
        <GrayButton onClick={() => router.back()}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      <Card className="mt-4 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">
              Paste JSON Array of Research Sources
            </label>
            <textarea
              className="border p-2 w-full rounded bg-white text-black"
              rows={10}
              placeholder={`[
  {
    "title": "Bathhouse NYC Market Analysis",
    "url": "https://www.nytimes.com/2023/02/05/style/bathhouse-nyc.html",
    "type": "Article",
    "source": "NY Times",
    "date": "2023-02-05",
    "tags": ["Market Growth", "NYC"],
    "summary": "An in-depth analysis of Bathhouse NYC's market potential.",
    "author": "John Doe",
    "notes": "Key insights for urban wellness trends."
  },
  {
    "title": "Othership Social Media Buzz",
    "url": "https://www.othership.com/",
    "type": "Website",
    "source": "Othership",
    "date": "2024-01-05",
    "tags": ["Social Media", "Engagement"],
    "summary": "Data on Othership's growing social media presence.",
    "notes": "Useful for competitor analysis."
  }
]`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              required
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Research Sources"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
