// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

  // Optionally, add filtering or pagination (like RFI) if desired
  // const [filterStatus, setFilterStatus] = useState("all");
  // etc.

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!orgId || !projectId || !subProjectId) return;
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

  // Deleting a record
  async function handleDelete(financeId: string) {
    try {
      await deleteFinance(orgId, projectId, subProjectId, financeId);
      setFinances((prev) => prev.filter((f) => f.id !== financeId));
    } catch (err: any) {
      console.error("Delete finance error:", err);
      setError("Failed to delete finance record.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Finances...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link to sub-project */}
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

      {/* Title + Create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">Finances</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/new`}
        >
          <GrayButton>Create New Finance</GrayButton>
        </Link>
      </div>

      {/* If you want filters, wrap in a <Card> like RFI does:
        <Card>
          <h2 className="text-lg font-semibold">Filter Finances</h2>
          ...
        </Card>
      */}

      {finances.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
          No finance records found. Create one!
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {finances.map((f) => (
            <Card key={f.id} className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  {f.type.toUpperCase()} – ${f.amount.toFixed(2)}
                </p>
                {f.description && <p className="text-sm mt-1">{f.description}</p>}
                <p className="text-sm">Status: {f.status || "N/A"}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/${f.id}`}
                  className="
                    text-blue-600 underline text-sm
                    hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                  "
                >
                  View
                </Link>
                <GrayButton
                  onClick={() => handleDelete(f.id)}
                  className="text-xs bg-red-600 hover:bg-red-700"
                >
                  Delete
                </GrayButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
