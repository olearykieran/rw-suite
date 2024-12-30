// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/punch-lists/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

  useEffect(() => {
    async function load() {
      try {
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
    if (orgId && projectId && subProjectId) load();
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

  if (loading) return <div className="p-4">Loading Punch Lists...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Project
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Punch Lists</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Punch List
        </Link>
      </div>

      {punchLists.length === 0 ? (
        <p>No punch lists found. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {punchLists.map((pl) => (
            <li
              key={pl.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{pl.title}</p>
                <p className="text-sm text-gray-600">Status: {pl.status || "open"}</p>
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/punch-lists/${pl.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(pl.id)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
