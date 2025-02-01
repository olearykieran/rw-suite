"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchAllMasterTakeoffs,
  MasterTakeoffDoc,
  deleteMasterTakeoff,
} from "@/lib/services/MasterTakeoffService";

export default function MasterTakeoffListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [takeoffs, setTakeoffs] = useState<MasterTakeoffDoc[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllMasterTakeoffs(orgId, projectId, subProjectId);
        setTakeoffs(data);
      } catch (err: any) {
        console.error("Failed to load master takeoffs:", err);
        setError("Failed to load master takeoffs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(takeoffId: string) {
    try {
      await deleteMasterTakeoff(orgId, projectId, subProjectId, takeoffId);
      setTakeoffs((prev) => prev.filter((t) => t.id !== takeoffId));
    } catch (err: any) {
      console.error("Delete master takeoff error:", err);
      setError("Failed to delete");
    }
  }

  if (loading) return <PageContainer>Loading Master Takeoffs...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/new`}
          >
            <GrayButton>New Takeoff (Manual)</GrayButton>
          </Link>
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/import`}
          >
            <GrayButton>Import Takeoff (CSV -> GPT)</GrayButton>
          </Link>
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-2">Master Takeoff List</h2>
        {takeoffs.length === 0 ? (
          <p className="text-sm text-neutral-600">No takeoff docs yet.</p>
        ) : (
          <div className="space-y-3">
            {takeoffs.map((t) => (
              <div
                key={t.id}
                className="p-2 border-b last:border-none hover:bg-neutral-50 rounded"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {t.name || `Takeoff ${t.id.substring(0, 5)}...`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {t.items?.length || 0} items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <GrayButton
                      onClick={() =>
                        router.push(
                          `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/${t.id}`
                        )
                      }
                    >
                      View
                    </GrayButton>
                    <GrayButton
                      onClick={() => handleDelete(t.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </GrayButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
