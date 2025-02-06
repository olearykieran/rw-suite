/**
 * src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/bid-leveler/[bidId]/leveling/page.tsx
 */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  fetchMasterTakeoff,
  MasterTakeoffDoc,
  MasterTakeoffItem,
} from "@/lib/services/MasterTakeoffService";
import { fetchBid, BidDoc } from "@/lib/services/BidLevelerService";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

interface MatchedLine {
  lineText: string;
  matchedItemId: string | null;
  confidence: number;
}

/**
 * This page compares a Bid's "parsedLines" to a chosen Master Takeoff doc
 * and sums the cost of the matched items. The difference from the bid's lumpsum is displayed.
 */
export default function BidLevelingDetailPage() {
  const { orgId, projectId, subProjectId, bidId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    bidId: string;
  };

  const [takeoffId, setTakeoffId] = useState("");
  const [masterTakeoff, setMasterTakeoff] = useState<MasterTakeoffDoc | null>(null);
  const [bid, setBid] = useState<BidDoc | null>(null);
  const [matchedLines, setMatchedLines] = useState<MatchedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load the Bid
  useEffect(() => {
    async function loadBid() {
      try {
        setLoading(true);
        const b = await fetchBid(orgId, projectId, subProjectId, bidId);
        setBid(b);

        // If user already has parsed lines
        const lines = (b as any).parsedLines || [];
        setMatchedLines(lines);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error loading data.");
      } finally {
        setLoading(false);
      }
    }
    loadBid();
  }, [orgId, projectId, subProjectId, bidId]);

  // 2) Load the chosen MasterTakeoff
  async function handleLoadTakeoff() {
    if (!takeoffId.trim()) return;
    try {
      setLoading(true);
      const doc = await fetchMasterTakeoff(orgId, projectId, subProjectId, takeoffId);
      setMasterTakeoff(doc);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load that MasterTakeoff");
    } finally {
      setLoading(false);
    }
  }

  function computeMasterCostOfMatches() {
    if (!masterTakeoff) return 0;
    let total = 0;
    for (const mLine of matchedLines) {
      if (!mLine.matchedItemId) continue;
      const found = masterTakeoff.items.find((it) => it.id === mLine.matchedItemId);
      if (found && found.estimatedCost) {
        total += found.estimatedCost;
      }
    }
    return total;
  }

  if (loading) {
    return <PageContainer>Loading data...</PageContainer>;
  }
  if (error) {
    return <PageContainer>{error}</PageContainer>;
  }
  if (!bid) {
    return <PageContainer>Missing bid</PageContainer>;
  }

  const masterCost = masterTakeoff ? computeMasterCostOfMatches() : 0;
  const bidAmount = bid.bidAmount || 0;

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">
        Bid Leveling: {bid.contractor} ({bid.trade})
      </h1>

      <Card>
        <div className="mb-2 flex gap-2">
          <input
            placeholder="Enter MasterTakeoff ID..."
            value={takeoffId}
            onChange={(e) => setTakeoffId(e.target.value)}
            className="border p-2 rounded text-black"
          />
          <GrayButton onClick={handleLoadTakeoff}>Load Takeoff</GrayButton>
        </div>

        {masterTakeoff && (
          <>
            <p className=" text-gray-600">
              Loaded: {masterTakeoff.name} ({masterTakeoff.items.length} items)
            </p>
            <div className="mt-4 border p-2 rounded space-y-1">
              <p>
                <strong>Sum of Master Items (Matched):</strong>{" "}
                {masterCost.toLocaleString()}
              </p>
              <p>
                <strong>Contractor’s Lump Sum Bid:</strong> {bidAmount.toLocaleString()}
              </p>
              <p>
                <strong>Difference: </strong>
                {(bidAmount - masterCost).toLocaleString()}
              </p>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-4 space-y-2">
        <h2 className="text-lg font-semibold">Matched Lines from Bid Scope</h2>
        {matchedLines.length === 0 ? (
          <p className=" text-neutral-500">
            No parsed lines. Parse the scope or confirm matches first!
          </p>
        ) : (
          <table className="table-auto w-full  border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Line Text</th>
                <th className="border px-2 py-1">Matched Item</th>
                <th className="border px-2 py-1">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {matchedLines.map((m, idx) => {
                let itemDesc = "";
                if (masterTakeoff) {
                  const found = masterTakeoff.items.find(
                    (it) => it.id === m.matchedItemId
                  );
                  if (found) {
                    itemDesc = `[${found.trade}] ${found.description}`;
                  } else if (m.matchedItemId) {
                    itemDesc = `Item #${m.matchedItemId} not found in this takeoff doc.`;
                  } else {
                    itemDesc = "No match";
                  }
                } else {
                  itemDesc = m.matchedItemId || "No match";
                }
                return (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{m.lineText}</td>
                    <td className="border px-2 py-1">{itemDesc}</td>
                    <td className="border px-2 py-1 text-center">
                      {m.confidence.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </PageContainer>
  );
}
