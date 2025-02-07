// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/blueprints/new/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBlueprint } from "@/lib/services/BlueprintService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
// Import the global loading bar hook.
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function NewBlueprintPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const { setIsLoading } = useLoadingBar();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a blueprint file.");
      return;
    }
    setLoading(true);
    try {
      await createBlueprint(orgId, projectId, subProjectId, title, file);
      setIsLoading(true);
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints`
      );
    } catch (err: any) {
      console.error("createBlueprint error:", err);
      setError(err.message || "Failed to upload blueprint");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setIsLoading(true);
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints`
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upload New Blueprint</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium">Title</label>
            <input
              className="border p-2 w-full rounded bg-white text-black dark:bg-neutral-800 dark:text-white"
              placeholder="Floor Plan Level 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium">Blueprint File (PDF/Image)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded file:bg-gray-300 file:text-black hover:file:bg-gray-400 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600 transition-colors"
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
