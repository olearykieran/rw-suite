// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/change-orders/new/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders`}
        className="text-blue-600 underline"
      >
        &larr; Back to Change Orders
      </Link>

      <h1 className="text-2xl font-bold">Create Change Order</h1>

      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            className="border p-2 w-full"
            placeholder="CO #001 - Additional Excavation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            rows={3}
            placeholder="Describe the scope or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Reason</label>
          <input
            className="border p-2 w-full"
            placeholder="Design change, owner request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="border p-2 w-full"
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
            className="border p-2 w-full"
            placeholder="5000"
            value={costImpact}
            onChange={(e) => setCostImpact(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Schedule Impact (days)</label>
          <input
            type="number"
            className="border p-2 w-full"
            placeholder="2"
            value={scheduleImpact}
            onChange={(e) => setScheduleImpact(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          {loading ? "Creating..." : "Create Change Order"}
        </button>
      </form>
    </main>
  );
}
