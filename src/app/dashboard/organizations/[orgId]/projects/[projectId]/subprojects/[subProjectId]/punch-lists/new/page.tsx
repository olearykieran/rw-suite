// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/punch-lists/new/page.tsx

"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { createPunchList } from "@/lib/services/PunchListService";

export default function NewPunchListPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createPunchList(orgId, projectId, subProjectId, {
        title,
        description,
        status,
        items: [],
      });
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`
      );
    } catch (err: any) {
      console.error("Create punch list error:", err);
      setError(err.message || "Failed to create punch list.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists`
    );
  }

  return (
    <PageContainer>
      {/* Page title + Cancel */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Punch List</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="inProgress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
