"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

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

  // For fade-in
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchAllChangeOrders(orgId, projectId, subProjectId);
        setChangeOrders(data);
      } catch (err: any) {
        console.error("Fetch change orders error:", err);
        setError("Failed to load change orders.");
      } finally {
        setLoading(false);
        // Trigger fade in
        setTimeout(() => setShowContent(true), 100);
      }
    }
    if (orgId && projectId && subProjectId) {
      load();
    }
  }, [orgId, projectId, subProjectId]);

  // Deleting a record
  async function handleDelete(coId: string) {
    try {
      await deleteChangeOrder(orgId, projectId, subProjectId, coId);
      setChangeOrders((prev) => prev.filter((co) => co.id !== coId));
    } catch (err: any) {
      console.error("Delete change order error:", err);
      setError("Failed to delete change order.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm">Loading Change Orders...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <PageContainer>
      {/* === Section #1: Back link & Title === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[0ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`}
            className="
              text-sm font-medium text-blue-600 underline
              hover:text-blue-700 dark:text-blue-400
              dark:hover:text-blue-300 transition-colors
            "
          >
            &larr; Back to Sub-Project
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
          <h1 className="text-2xl font-bold">Change Orders</h1>
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders/new`}
          >
            <GrayButton>Create Change Order</GrayButton>
          </Link>
        </div>
      </div>

      {/* === Section #2: List or Empty State === */}
      <div
        className={`
          opacity-0 transition-all duration-500 ease-out delay-[100ms]
          ${showContent ? "opacity-100 translate-y-0" : "translate-y-4"}
        `}
      >
        {changeOrders.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
            No change orders found. Create one!
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {changeOrders.map((co) => (
              <Card key={co.id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{co.title}</p>
                  {co.costImpact !== undefined && (
                    <p className="text-sm">Cost Impact: ${co.costImpact.toFixed(2)}</p>
                  )}
                  {co.scheduleImpact !== undefined && (
                    <p className="text-sm">Schedule Impact: {co.scheduleImpact} day(s)</p>
                  )}
                  {co.status && <p className="text-sm">Status: {co.status}</p>}
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/change-orders/${co.id}`}
                    className="
                      text-blue-600 underline text-sm
                      hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                    "
                  >
                    View
                  </Link>
                  <GrayButton
                    onClick={() => handleDelete(co.id)}
                    className="text-xs bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </GrayButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
