// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/change-orders/new/page.tsx

"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { createChangeOrder } from "@/lib/services/ChangeOrderService";

export default function NewChangeOrderPage() {
  const router = useRouter();
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("draft");
  const [costImpact, setCostImpact] = useState("");
  const [scheduleImpact, setScheduleImpact] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createChangeOrder(orgId, projectId, subProjectId, {
        title,
        description,
        reason,
        status,
        costImpact: costImpact ? parseFloat(costImpact) : 0,
        scheduleImpact: scheduleImpact ? parseFloat(scheduleImpact) : 0,
      });
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`
      );
    } catch (err: any) {
      console.error("Create change order error:", err);
      setError(err.message || "Failed to create change order.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`
    );
  }

  return (
    <PageContainer>
      {/* Page Title + Cancel button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Change Order</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="CO #001 - Additional Excavation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              rows={3}
              placeholder="Describe the scope or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Reason</label>
            <input
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="Design change, owner request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Cost Impact (USD)</label>
            <input
              type="number"
              step="0.01"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="5000"
              value={costImpact}
              onChange={(e) => setCostImpact(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Schedule Impact (days)</label>
            <input
              type="number"
              className="
                border p-2 w-full rounded
                bg-white dark:bg-neutral-800 dark:text-white
              "
              placeholder="2"
              value={scheduleImpact}
              onChange={(e) => setScheduleImpact(e.target.value)}
            />
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Change Order"}
          </GrayButton>
        </form>
      </Card>
    </PageContainer>
  );
}
