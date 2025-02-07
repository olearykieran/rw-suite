"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { fetchAllBids, BidDoc, deleteBid } from "@/lib/services/BidLevelerService";

/**
 * BidListPage - lists all the bids for a given subProject
 */
export default function BidListPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [bids, setBids] = useState<BidDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!orgId || !projectId || !subProjectId) return;

        const data = await fetchAllBids(orgId, projectId, subProjectId);
        // Example: sort by submissionDate descending
        const sorted = data.sort((a, b) => {
          const aDate = a.submissionDate ? a.submissionDate.getTime() : 0;
          const bDate = b.submissionDate ? b.submissionDate.getTime() : 0;
          return bDate - aDate;
        });
        setBids(sorted);
      } catch (err) {
        console.error("Failed to load bids:", err);
        setError("Failed to load bids");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId]);

  async function handleDelete(bidId: string) {
    try {
      await deleteBid(orgId, projectId, subProjectId, bidId);
      setBids((prev) => prev.filter((b) => b.id !== bidId));
    } catch (err) {
      console.error("Delete bid error:", err);
      setError("Failed to delete bid");
    }
  }

  if (loading) return <PageContainer>Loading bids...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;

  return (
    <PageContainer>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <GrayButton
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}`
            )
          }
        >
          &larr; Back
        </GrayButton>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/compare`}
          >
            <GrayButton>Compare Bids</GrayButton>
          </Link>
          <Link
            href={`/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/new`}
          >
            <GrayButton>Create New Bid</GrayButton>
          </Link>
        </div>
      </div>

      {/* Bids List */}
      <Card>
        <h1 className="text-xl font-semibold mb-2">All Bids</h1>
        {bids.length === 0 ? (
          <p className=" text-neutral-600">No bids found.</p>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => {
              const dateStr = bid.submissionDate
                ? bid.submissionDate.toLocaleDateString()
                : "No date";
              return (
                <div
                  key={bid.id}
                  className="p-2 border-b last:border-none hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {bid.trade} - {bid.contractor}
                      </p>
                      <p className=" text-neutral-600">
                        Amount: {bid.bidAmount?.toLocaleString() || "N/A"}
                      </p>
                      <p className=" text-neutral-600">Submitted: {dateStr}</p>
                    </div>
                    <div className="flex gap-2">
                      <GrayButton
                        onClick={() =>
                          router.push(
                            `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bid.id}`
                          )
                        }
                      >
                        View
                      </GrayButton>
                      <GrayButton
                        onClick={() => handleDelete(bid.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </GrayButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
