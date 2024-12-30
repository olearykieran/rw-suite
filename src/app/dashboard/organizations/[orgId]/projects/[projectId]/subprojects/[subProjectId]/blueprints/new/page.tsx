"use client";

import { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBlueprint } from "@/lib/services/BlueprintService";

export default function NewBlueprintPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

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

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Upload New Blueprint</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Title</label>
          <input
            className="border p-2 w-full"
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
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </main>
  );
}
