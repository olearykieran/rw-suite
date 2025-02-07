// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/blueprints/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllBlueprints } from "@/lib/services/BlueprintService";

// Shared UI components
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { AnimatedList } from "@/components/ui/AnimatedList";

// Import the global loading bar hook.
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function BlueprintListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

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
      {/* === Back Button === */}
      <GrayButton
        onClick={() => {
          setIsLoading(true);
          router.push(
            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
          );
        }}
      >
        &larr; Back to Subproject
      </GrayButton>

      {/* === Title & Upload Blueprint Button === */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 mt-4">
        <h1 className="text-2xl font-bold">Blueprints</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/new`}
          onClick={() => setIsLoading(true)}
        >
          <GrayButton>Upload Blueprint</GrayButton>
        </Link>
      </div>

      {/* === Animated List of Blueprints === */}
      <AnimatedList
        items={blueprints}
        isLoading={isInitialLoading}
        className="mt-4"
        emptyMessage={
          <p className="text-neutral-600 dark:text-neutral-300">No blueprints found.</p>
        }
        renderItem={(bp) => (
          <Card key={bp.id} className="flex flex-col gap-2">
            <p className="font-medium">{bp.title}</p>
            <Link
              href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/blueprints/${bp.id}`}
              onClick={() => setIsLoading(true)}
            >
              <GrayButton>View</GrayButton>
            </Link>
          </Card>
        )}
      />
    </PageContainer>
  );
}
