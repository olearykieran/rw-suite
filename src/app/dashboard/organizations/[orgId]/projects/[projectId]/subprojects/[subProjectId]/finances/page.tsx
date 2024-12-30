// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchAllFinances,
  FinanceDoc,
  deleteFinance,
} from "@/lib/services/FinanceService";

export default function FinanceListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const [finances, setFinances] = useState<FinanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllFinances(orgId, projectId, subProjectId);
        setFinances(data);
      } catch (err: any) {
        console.error("Fetch finances error:", err);
        setError("Failed to load finances.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(financeId: string) {
    try {
      await deleteFinance(orgId, projectId, subProjectId, financeId);
      setFinances((prev) => prev.filter((f) => f.id !== financeId));
    } catch (err: any) {
      console.error("Delete finance error:", err);
      setError("Failed to delete finance record.");
    }
  }

  if (loading) return <div className="p-4">Loading finances...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      {/* Back link */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Subproject
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finances</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Finance Record
        </Link>
      </div>

      {finances.length === 0 ? (
        <p>No finance records found. Create one!</p>
      ) : (
        <ul className="space-y-2">
          {finances.map((f) => (
            <li
              key={f.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  {f.type.toUpperCase()} - ${f.amount.toFixed(2)}
                </p>
                {f.description && (
                  <p className="text-sm text-gray-700">{f.description}</p>
                )}
                <p className="text-sm text-gray-600">Status: {f.status || "N/A"}</p>
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/${f.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-red-600 underline text-sm"
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
