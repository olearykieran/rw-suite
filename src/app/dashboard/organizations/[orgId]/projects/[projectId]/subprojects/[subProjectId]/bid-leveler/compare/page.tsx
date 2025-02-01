"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import Link from "next/link";

import { fetchAllBids, BidDoc } from "@/lib/services/BidLevelerService";

/**
 * CompareBidsPage - displays all bids in a table, side by side (or stacked).
 */
export default function CompareBidsPage() {
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
        const data = await fetchAllBids(orgId, projectId, subProjectId);
        setBids(data);
      } catch (err) {
        console.error("Compare Bids - error fetching:", err);
        setError("Failed to load bids for comparison.");
      } finally {
        setLoading(false);
      }
    }
    if (orgId && projectId && subProjectId) {
      load();
    }
  }, [orgId, projectId, subProjectId]);

  if (loading) return <PageContainer>Loading bids...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;

  return (
    <PageContainer>
      {/* Top controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            router.push(
              `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler`
            )
          }
          className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-semibold">Compare Bids</h1>
      </div>

      <Card>
        {bids.length === 0 ? (
          <p>No bids to compare.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="border px-2 py-1">Trade</th>
                  <th className="border px-2 py-1">Contractor</th>
                  <th className="border px-2 py-1">Bid Amount</th>
                  <th className="border px-2 py-1">Submission Date</th>
                  <th className="border px-2 py-1">Scope of Work</th>
                  <th className="border px-2 py-1">Exclusions</th>
                  <th className="border px-2 py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => {
                  const dateStr = b.submissionDate
                    ? b.submissionDate.toLocaleDateString()
                    : "";
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="border px-2 py-1">{b.trade}</td>
                      <td className="border px-2 py-1">{b.contractor}</td>
                      <td className="border px-2 py-1">
                        {b.bidAmount ? b.bidAmount.toLocaleString() : ""}
                      </td>
                      <td className="border px-2 py-1">{dateStr}</td>
                      <td className="border px-2 py-1 whitespace-pre-line">
                        {b.scopeOfWork}
                      </td>
                      <td className="border px-2 py-1 whitespace-pre-line">
                        {b.exclusions}
                      </td>
                      <td className="border px-2 py-1 whitespace-pre-line">{b.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
