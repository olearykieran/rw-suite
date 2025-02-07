// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/site-visits/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAllSiteVisits, SiteVisitDoc } from "@/lib/services/SiteVisitService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { useLoadingBar } from "@/context/LoadingBarContext";

export default function SiteVisitListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();
  const { setIsLoading } = useLoadingBar();

  const [visits, setVisits] = useState<SiteVisitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVisits() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllSiteVisits(orgId, projectId, subProjectId);
        // Sort visits by visitDate descending
        const sorted = data.sort(
          (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        );
        setVisits(sorted);
      } catch (err: any) {
        setError("Failed to load Site Visits");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadVisits();
  }, [orgId, projectId, subProjectId]);

  if (loading) {
    return <PageContainer>Loading site visits...</PageContainer>;
  }

  if (error) {
    return <PageContainer>{error}</PageContainer>;
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <GrayButton
          onClick={() => {
            setIsLoading(true);
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            );
          }}
        >
          &larr; Back to Sub-Project
        </GrayButton>
        <GrayButton
          onClick={() => {
            setIsLoading(true);
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits/new`
            );
          }}
        >
          Create New Site Visit
        </GrayButton>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-2 text-black dark:text-white">
          Site Visits
        </h1>
        {visits.length === 0 ? (
          <p>No site visits found.</p>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="p-2 border-b last:border-none hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      {new Date(visit.visitDate).toLocaleDateString()}
                    </p>
                    <p className="text-neutral-600">
                      Participants: {visit.participants.join(", ") || "N/A"}
                    </p>
                  </div>
                  <GrayButton
                    onClick={() => {
                      setIsLoading(true);
                      router.push(
                        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits/${visit.id}`
                      );
                    }}
                  >
                    View
                  </GrayButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
