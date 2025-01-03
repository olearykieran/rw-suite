// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/punch-lists/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchAllPunchLists,
  deletePunchList,
  PunchListDoc,
} from "@/lib/services/PunchListService";

export default function PunchListIndexPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [punchLists, setPunchLists] = useState<PunchListDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // (Optional) If you want filters/pagination, define states here
  // e.g. const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllPunchLists(orgId, projectId, subProjectId);
        setPunchLists(data);
      } catch (err: any) {
        console.error("Fetch punch lists error:", err);
        setError("Failed to load punch lists.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(id: string) {
    try {
      await deletePunchList(orgId, projectId, subProjectId, id);
      setPunchLists((prev) => prev.filter((pl) => pl.id !== id));
    } catch (err: any) {
      console.error("Delete punch list error:", err);
      setError("Failed to delete punch list.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Punch Lists...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link to sub-project */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
          className="
            text-sm font-medium text-blue-600 underline
            hover:text-blue-700 dark:text-blue-400
            dark:hover:text-blue-300 transition-colors
          "
        >
          &larr; Back to Sub-Project
        </Link>
      </div>

      {/* Title + Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">Punch Lists</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists/new`}
        >
          <GrayButton>Create Punch List</GrayButton>
        </Link>
      </div>

      {/* If you want a filter card, do like RFI:
          <Card>
            <h2 className="text-lg font-semibold">Filter Punch Lists</h2>
            ...
          </Card>
      */}

      {punchLists.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No punch lists found. Create one!
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {punchLists.map((pl) => (
            <Card key={pl.id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{pl.title}</p>
                <p className="text-sm">Status: {pl.status || "open"}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists/${pl.id}`}
                  className="
                    text-blue-600 underline text-sm
                    hover:text-blue-700 dark:text-blue-400
                    dark:hover:text-blue-300
                  "
                >
                  View
                </Link>
                <GrayButton
                  onClick={() => handleDelete(pl.id)}
                  className="text-xs bg-red-600 hover:bg-red-700"
                >
                  Delete
                </GrayButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* If you have pagination logic, place it here */}
    </PageContainer>
  );
}
