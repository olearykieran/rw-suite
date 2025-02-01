"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import { fetchBid } from "@/lib/services/BidLevelerService";
import {
  fetchAllMasterTakeoffs,
  MasterTakeoffDoc,
  MasterTakeoffItem,
} from "@/lib/services/MasterTakeoffService";

function chunkString(str: string, size = 2500): string[] {
  const chunks: string[] = [];
  let current = 0;
  while (current < str.length) {
    chunks.push(str.slice(current, current + size));
    current += size;
  }
  return chunks;
}

interface ParsedLine {
  lineText: string;
  matchedItemId: string | null;
}

export default function ParseBidScopePage() {
  const { orgId, projectId, subProjectId, bidId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    bidId: string;
  };
  const router = useRouter();

  const [bid, setBid] = useState<any>(null);
  const [masterDocs, setMasterDocs] = useState<MasterTakeoffDoc[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [rawBidText, setRawBidText] = useState("");

  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load the Bid doc
  useEffect(() => {
    async function loadBid() {
      try {
        if (!orgId || !projectId || !subProjectId || !bidId) return;
        const b = await fetchBid(orgId, projectId, subProjectId, bidId);
        setBid(b);
      } catch (err: any) {
        console.error("Load bid error:", err);
        setError(err.message);
      }
    }
    loadBid();
  }, [orgId, projectId, subProjectId, bidId]);

  // 2) Load all possible MasterTakeoff docs for this subProject
  useEffect(() => {
    async function loadMasters() {
      try {
        if (!orgId || !projectId || !subProjectId) return;
        const docs = await fetchAllMasterTakeoffs(orgId, projectId, subProjectId);
        setMasterDocs(docs);
      } catch (err: any) {
        console.error("Load master takeoffs error:", err);
        setError(err.message);
      }
    }
    loadMasters();
  }, [orgId, projectId, subProjectId]);

  async function handleParse(e: FormEvent) {
    e.preventDefault();
    if (!selectedMasterId) {
      alert("Please select a Master Takeoff first.");
      return;
    }
    if (!rawBidText.trim()) {
      alert("Paste some raw text from the bid scope first!");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setParsedLines([]);

      // 1) Find the selected Master doc
      const masterDoc = masterDocs.find((m) => m.id === selectedMasterId);
      if (!masterDoc) {
        throw new Error("Master takeoff doc not found");
      }

      // 2) We'll chunk the raw text if it’s too big
      const chunks = chunkString(rawBidText, 2500);
      console.log("Parsing scope in", chunks.length, "chunk(s).");

      const finalLines: ParsedLine[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        // 3) POST to /api/parse-bid-scope
        const bodyData = {
          rawBidText: chunkText,
          masterItems: masterDoc.items, // pass the entire items array
        };
        const res = await fetch("/api/parse-bid-scope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Chunk ${i + 1} failed to parse`);
        }

        // Merge lines
        if (json.data && Array.isArray(json.data.parsedLines)) {
          finalLines.push(...json.data.parsedLines);
        }
      }

      // 4) We have combined lines => store them locally
      setParsedLines(finalLines);
    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMatches() {
    if (!parsedLines || parsedLines.length === 0) {
      alert("No lines to save. Please parse first!");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/update-bid-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          projectId,
          subProjectId,
          bidId,
          parsedLines,
        }),
      });
      if (!res.ok) {
        const js = await res.json();
        throw new Error(js.error || "Failed to update bid matches");
      }
      alert("Parsed lines saved to Firestore!");
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}/leveling`
      );
    } catch (err: any) {
      console.error("Save matches error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bidId}`
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Parse Scope for Bid</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card className="mt-4">
        {bid ? (
          <p className="text-sm text-gray-600">
            Bid: <strong>{bid.trade}</strong> - {bid.contractor}
          </p>
        ) : (
          <p>Loading bid...</p>
        )}
      </Card>

      <Card className="mt-4 space-y-4">
        <form onSubmit={handleParse}>
          <label className="block text-sm font-medium mb-1">
            Select a Master Takeoff:
          </label>
          <select
            className="border p-2 rounded text-black w-full mb-4"
            value={selectedMasterId}
            onChange={(e) => setSelectedMasterId(e.target.value)}
          >
            <option value="">-- Select Master --</option>
            {masterDocs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id} ({m.items.length} items)
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium mb-1">Raw Bid Scope Text</label>
          <textarea
            className="border p-2 w-full rounded text-black"
            rows={8}
            value={rawBidText}
            onChange={(e) => setRawBidText(e.target.value)}
          />

          <GrayButton type="submit" disabled={loading} className="mt-2">
            {loading ? "Parsing..." : "Parse With GPT"}
          </GrayButton>
        </form>
      </Card>

      {parsedLines.length > 0 && (
        <Card className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold">Parsed Lines</h2>
          <div className="max-h-64 overflow-auto border p-2 text-sm">
            {parsedLines.map((pl, i) => (
              <div key={i} className="mb-1">
                <strong>Line:</strong> {pl.lineText}
                <br />
                <strong>Match:</strong> {pl.matchedItemId ? pl.matchedItemId : "No match"}
                <br />
                <hr className="my-1" />
              </div>
            ))}
          </div>

          <GrayButton onClick={handleSaveMatches} disabled={loading}>
            {loading ? "Saving..." : "Save Parsed Lines to Firestore"}
          </GrayButton>
        </Card>
      )}
    </PageContainer>
  );
}
