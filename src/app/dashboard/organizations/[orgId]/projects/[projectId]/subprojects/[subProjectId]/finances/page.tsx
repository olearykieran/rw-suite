// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/finances/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { useLoading, LoadingProvider } from "@/components/ui/LoadingProvider";
import { AnimatedList } from "@/components/ui/AnimatedList";
import {
  fetchAllFinances,
  FinanceDoc,
  deleteFinance,
} from "@/lib/services/FinanceService";

/**
 * FinanceListContent handles the logic for fetching, rendering,
 * and deleting finance records. It relies on the useLoading hook,
 * so it must be rendered within a LoadingProvider.
 */
function FinanceListContent() {
  const { withLoading } = useLoading();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [finances, setFinances] = useState<FinanceDoc[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Load initial finance data from Firestore.
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllFinances(orgId, projectId, subProjectId);
        setFinances(data);
      } catch (err: any) {
        console.error("Fetch finances error:", err);
        setError("Failed to load finances.");
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadData();
  }, [orgId, projectId, subProjectId]);

  // Handle deletion of a finance record.
  async function handleDelete(financeId: string) {
    await withLoading(async () => {
      try {
        await deleteFinance(orgId, projectId, subProjectId, financeId);
        setFinances((prev) => prev.filter((f) => f.id !== financeId));
      } catch (err: any) {
        console.error("Delete finance error:", err);
        setError("Failed to delete finance record.");
      }
    });
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* Back link to the sub-project overview */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        &larr; Back to Sub-Project
      </Link>

      {/* Title and Create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
        <h1 className="text-2xl font-bold">Finances</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/new`}
        >
          <GrayButton>Create New Finance</GrayButton>
        </Link>
      </div>

      {/* Render the list of finance records */}
      <AnimatedList
        items={finances}
        isLoading={isInitialLoading}
        className="mt-4"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No finance records found. Create one!
          </p>
        }
        renderItem={(finance) => (
          <Card className="flex justify-between items-center">
            <div>
              <p className="font-semibold">
                {finance.type.toUpperCase()} – ${finance.amount.toFixed(2)}
              </p>
              {finance.description && (
                <p className="text-sm mt-1">{finance.description}</p>
              )}
              <p className="text-sm">Status: {finance.status || "N/A"}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/finances/${finance.id}`}
                className="text-blue-600 underline text-sm hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View
              </Link>
              <GrayButton
                onClick={() => handleDelete(finance.id)}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                Delete
              </GrayButton>
            </div>
          </Card>
        )}
      />
    </PageContainer>
  );
}

/**
 * FinanceListPage wraps FinanceListContent within a LoadingProvider.
 * This ensures that the useLoading hook has the required context.
 */
export default function FinanceListPage() {
  return (
    <LoadingProvider>
      <FinanceListContent />
    </LoadingProvider>
  );
}
