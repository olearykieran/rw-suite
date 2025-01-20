"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllBlueprints } from "@/lib/services/BlueprintService";

// Shared UI
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

export default function BlueprintListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
        setIsInitialLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* === Back link === */}
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="
          text-sm font-medium text-blue-600 underline 
          hover:text-blue-700 dark:text-blue-400 
          dark:hover:text-blue-300 transition-colors
        "
      >
        &larr; Back to Subproject
      </Link>

      {/* === Title & Button === */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 mt-4">
        <h1 className="text-2xl font-bold">Blueprints</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/new`}
        >
          <GrayButton>Upload Blueprint</GrayButton>
        </Link>
      </div>

      {/* === Animated List of blueprints === */}
      <AnimatedList
        items={blueprints}
        isLoading={isInitialLoading}
        className="mt-4"
        emptyMessage={
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            No blueprints found.
          </p>
        }
        renderItem={(bp) => (
          <Card key={bp.id} className="flex flex-col gap-2">
            <p className="font-medium">{bp.title}</p>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/${bp.id}`}
              className="
                text-blue-600 underline text-sm
                hover:text-blue-700
                dark:text-blue-400 dark:hover:text-blue-300
              "
            >
              View
            </Link>
          </Card>
        )}
      />
    </PageContainer>
  );
}
