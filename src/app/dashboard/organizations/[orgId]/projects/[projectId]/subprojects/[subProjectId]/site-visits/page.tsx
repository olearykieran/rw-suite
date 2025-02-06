// File: src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/site-visits/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { fetchAllSiteVisits, SiteVisitDoc } from "@/lib/services/SiteVisitService";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

/**
 * SiteVisitListPage
 * Lists all the site visits for the subProject
 */
export default function SiteVisitListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [visits, setVisits] = useState<SiteVisitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVisits() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const data = await fetchAllSiteVisits(orgId, projectId, subProjectId);
        // Sort by date or createdAt, your choice
        const sorted = data.sort((a, b) => {
          // Convert visitDate to date objects for comparison, etc.
          return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
        });
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
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits/new`}
        >
          <GrayButton>Create New Site Visit</GrayButton>
        </Link>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-2 text-black dark:text-white ">
          Site Visits
        </h1>
        {visits.length === 0 ? (
          <p className="text-sm text-black">No site visits found.</p>
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
                    <p className="text-sm text-neutral-600">
                      Participants: {visit.participants.join(", ") || "N/A"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/site-visits/${visit.id}`}
                  >
                    <GrayButton>View</GrayButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
