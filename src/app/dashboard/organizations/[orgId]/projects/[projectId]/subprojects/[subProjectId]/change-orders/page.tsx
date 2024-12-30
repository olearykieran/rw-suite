// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/change-orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchAllChangeOrders,
  deleteChangeOrder,
  ChangeOrderDoc,
} from "@/lib/services/ChangeOrderService";

export default function ChangeOrderListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };

  const [changeOrders, setChangeOrders] = useState<ChangeOrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        setLoading(true);
        const data = await fetchAllChangeOrders(orgId, projectId, subProjectId);
        setChangeOrders(data);
      } catch (err: any) {
        console.error("Fetch change orders error:", err);
        setError("Failed to load change orders.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(coId: string) {
    try {
      await deleteChangeOrder(orgId, projectId, subProjectId, coId);
      setChangeOrders((prev) => prev.filter((c) => c.id !== coId));
    } catch (err: any) {
      console.error("Delete change order error:", err);
      setError("Failed to delete change order.");
    }
  }

  if (loading) return <div className="p-4">Loading Change Orders...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <main className="p-4 space-y-4">
      <Link
        href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
        className="text-blue-600 underline"
      >
        &larr; Back to Sub-Project
      </Link>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Change Orders</h1>
        <Link
          href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders/new`}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        >
          Create Change Order
        </Link>
      </div>

      {changeOrders.length === 0 ? (
        <p>No change orders found. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {changeOrders.map((co) => (
            <li
              key={co.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{co.title}</p>
                {co.costImpact !== undefined && (
                  <p className="text-sm text-gray-600">
                    Cost Impact: ${co.costImpact.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders/${co.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(co.id)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
