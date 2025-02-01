"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import {
  createMasterTakeoff,
  MasterTakeoffDoc,
} from "@/lib/services/MasterTakeoffService";

export default function NewMasterTakeoffPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [name, setName] = useState("");
  const [itemsJSON, setItemsJSON] = useState(`[]`);
  // user can paste a quick JSON array if they want or later add a UI

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff`
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // parse items from JSON
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(itemsJSON);
      } catch (err) {
        throw new Error("Items JSON is invalid");
      }

      if (!Array.isArray(parsed)) {
        throw new Error("Items JSON must be an array");
      }

      const docId = await createMasterTakeoff(orgId, projectId, subProjectId, {
        name,
        items: parsed,
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/${docId}`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create master takeoff");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">New Master Takeoff (Manual)</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name (optional)</label>
            <input
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              placeholder="E.g. 'Takeoff V1'"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Items (JSON array)</label>
            <textarea
              className="border bg-neutral-300 text-black p-2 w-full rounded"
              rows={10}
              value={itemsJSON}
              onChange={(e) => setItemsJSON(e.target.value)}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Example: [{"{"}"trade":"Plumbing","description":"16
              Toilets","quantity":16,...{"}"}]
            </p>
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Takeoff"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
