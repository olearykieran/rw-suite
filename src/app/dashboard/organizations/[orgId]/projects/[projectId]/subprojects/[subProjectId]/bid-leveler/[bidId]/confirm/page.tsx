"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebaseConfig";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { fetchBid, BidDoc } from "@/lib/services/BidLevelerService";
import {
  fetchAllMasterTakeoffs,
  MasterTakeoffDoc,
  MasterTakeoffItem,
} from "@/lib/services/MasterTakeoffService";

/** GPT output structure for each line */
interface ParsedLine {
  lineText: string;
  matchedItemId: string | null;
  confidence: number;
}

/**
 * ConfirmMatchesPage:
 * - Loads a bid doc that already has 'parsedLines' in it
 * - Let user pick which masterTakeoff to show item references from
 * - For each line, user can override matchedItemId via <select>
 * - Save final lines back to Firestore
 */
export default function ConfirmMatchesPage() {
  const { orgId, projectId, subProjectId, bidId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    bidId: string;
  };
  const router = useRouter();

  const [bid, setBid] = useState<BidDoc | null>(null);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [masters, setMasters] = useState<MasterTakeoffDoc[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [masterItems, setMasterItems] = useState<MasterTakeoffItem[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1) Load the Bid
  useEffect(() => {
    async function loadBidData() {
      try {
        if (!orgId || !projectId || !subProjectId || !bidId) return;
        setLoading(true);
        const b = await fetchBid(orgId, projectId, subProjectId, bidId);
        setBid(b);

        // If it has lines
        const lines = (b as any).parsedLines || [];
        setParsedLines(lines);
      } catch (err: any) {
        console.error("Fetch bid error:", err);
        setError(err.message || "Failed to load bid");
      } finally {
        setLoading(false);
      }
    }
    loadBidData();
  }, [orgId, projectId, subProjectId, bidId]);

  // 2) Load all master takeoffs
  useEffect(() => {
    async function loadAllMasters() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const docs = await fetchAllMasterTakeoffs(orgId, projectId, subProjectId);
        setMasters(docs);
      } catch (err: any) {
        console.error("Load masters error:", err);
        setError(err.message);
      }
    }
    loadAllMasters();
  }, [orgId, projectId, subProjectId]);

  // 3) If user picks a master, load its items
  async function handleSelectMaster(masterId: string) {
    setSelectedMasterId(masterId);
    setMasterItems([]);
    if (!masterId) return;
    try {
      setLoading(true);
      const docRef = await fetchAllMasterTakeoffs(orgId, projectId, subProjectId);
      const found = docRef.find((m) => m.id === masterId);
      if (found) {
        setMasterItems(found.items);
      }
    } catch (err: any) {
      console.error("Load selected master error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChangeMatch(index: number, newId: string) {
    setParsedLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        matchedItemId: newId || null,
      };
      return copy;
    });
  }

  async function handleSave() {
    if (!bid) return;
    try {
      setLoading(true);
      setError("");

      // We'll just do an updateDoc from the client in this example
      const docRef = doc(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "subprojects",
        subProjectId,
        "bids",
        bid.id
      );
      await updateDoc(docRef, {
        parsedLines,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid || null,
      });

      alert("Matches saved!");
    } catch (err: any) {
      console.error("handleSave error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}`
    );
  }

  if (loading) return <PageContainer>Loading...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;
  if (!bid) return <PageContainer>No Bid found.</PageContainer>;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          Confirm Matches for Bid: {bid.trade} - {bid.contractor}
        </h1>
        <GrayButton onClick={handleBack}>Back</GrayButton>
      </div>

      <Card>
        <p className="text-sm">
          This page lets you override any GPT matching. Once saved, you can check the
          leveling page to see the total matched cost.
        </p>

        <label className="block text-sm font-medium mt-4 mb-1">
          Select a Master Takeoff to reference:
        </label>
        <select
          className="border p-2 text-black rounded"
          value={selectedMasterId}
          onChange={(e) => handleSelectMaster(e.target.value)}
        >
          <option value="">-- Select --</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.id} ({m.items.length} items)
            </option>
          ))}
        </select>
      </Card>

      <Card className="mt-4 space-y-2">
        {parsedLines.length === 0 ? (
          <p className="text-sm text-gray-600">No parsed lines found in this bid.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Line Text</th>
                  <th className="border px-2 py-1">Matched Item</th>
                  <th className="border px-2 py-1">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {parsedLines.map((pl, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 w-1/2">{pl.lineText}</td>
                    <td className="border px-2 py-1">
                      {masterItems.length > 0 ? (
                        <select
                          className="p-1 text-black border rounded w-full"
                          value={pl.matchedItemId || ""}
                          onChange={(e) => handleChangeMatch(idx, e.target.value)}
                        >
                          <option value="">No match</option>
                          {masterItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              [{item.trade}] {item.description}
                            </option>
                          ))}
                        </select>
                      ) : pl.matchedItemId ? (
                        pl.matchedItemId
                      ) : (
                        "No match"
                      )}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {pl.confidence.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {parsedLines.length > 0 && (
        <div className="mt-4">
          <GrayButton onClick={handleSave}>Save Updates</GrayButton>
        </div>
      )}
    </PageContainer>
  );
}
