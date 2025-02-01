"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchMasterTakeoff,
  updateMasterTakeoff,
  MasterTakeoffDoc,
  deleteMasterTakeoff,
} from "@/lib/services/MasterTakeoffService";

/**
 * MasterTakeoffDetailPage
 *
 * This page allows you to view and edit a Master Takeoff document.
 * We have added a new navigation button ("View Report") which
 * takes you to a reporting page for this takeoff.
 */
export default function MasterTakeoffDetailPage() {
  const { orgId, projectId, subProjectId, takeoffId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    takeoffId: string;
  };

  const router = useRouter();
  const [takeoff, setTakeoff] = useState<MasterTakeoffDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editable fields for the master takeoff.
  const [name, setName] = useState("");
  const [itemsJSON, setItemsJSON] = useState("[]");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const doc = await fetchMasterTakeoff(orgId, projectId, subProjectId, takeoffId);
        setTakeoff(doc);
        setName(doc.name || "");
        setItemsJSON(JSON.stringify(doc.items || [], null, 2));
      } catch (err: any) {
        console.error(err);
        setError("Failed to load Master Takeoff");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, takeoffId]);

  async function handleSave() {
    if (!takeoff) return;
    try {
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(itemsJSON);
      } catch (err) {
        throw new Error("Items JSON is invalid");
      }
      await updateMasterTakeoff(orgId, projectId, subProjectId, takeoff.id, {
        name,
        items: parsed,
      });
      alert("Takeoff updated!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update");
    }
  }

  async function handleDelete() {
    if (!takeoff) return;
    if (!confirm("Are you sure you want to delete this takeoff?")) return;
    try {
      await deleteMasterTakeoff(orgId, projectId, subProjectId, takeoff.id);
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff`
      );
    } catch (err: any) {
      console.error(err);
      setError("Failed to delete");
    }
  }

  if (loading) return <PageContainer>Loading Takeoff...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;
  if (!takeoff) return <PageContainer>No record found.</PageContainer>;

  return (
    <PageContainer>
      {/* Navigation section */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          {/* New "View Report" button navigates to the reporting page for this takeoff */}
          <GrayButton
            onClick={() =>
              router.push(
                `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/${takeoff.id}/reporting`
              )
            }
          >
            View Report
          </GrayButton>
          <GrayButton
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </GrayButton>
        </div>
      </div>

      <Card>
        <h1 className="text-xl font-semibold mb-2">
          Master Takeoff: {takeoff.name || takeoff.id}
        </h1>
        <div className="mb-4">
          <label className="block text-sm font-medium">Name</label>
          <input
            className="border bg-white text-black p-2 w-full rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Items (JSON)</label>
          <textarea
            className="border bg-white text-black p-2 w-full rounded text-xs"
            rows={10}
            value={itemsJSON}
            onChange={(e) => setItemsJSON(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <GrayButton onClick={handleSave}>Save Updates</GrayButton>
        </div>
      </Card>
    </PageContainer>
  );
}
