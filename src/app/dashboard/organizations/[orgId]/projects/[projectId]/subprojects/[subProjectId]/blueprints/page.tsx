"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllBlueprints } from "@/lib/services/BlueprintService";

export default function BlueprintListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllBlueprints(orgId, projectId, subProjectId);
        setBlueprints(data);
      } catch (err: any) {
        console.error("fetchAllBlueprints error:", err);
        setError("Failed to load blueprints.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  if (loading) return <div className="p-4">Loading Blueprints...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      {/* Back link -> consistent style */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Subproject
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Blueprints</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Upload Blueprint
        </Link>
      </div>

      {blueprints.length === 0 ? (
        <p>No blueprints found.</p>
      ) : (
        <ul className="space-y-2">
          {blueprints.map((bp) => (
            <li key={bp.id} className="border rounded p-3">
              <p className="font-medium">{bp.title}</p>
              <Link
                href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/${bp.id}`}
                className="text-blue-600 underline text-sm"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
