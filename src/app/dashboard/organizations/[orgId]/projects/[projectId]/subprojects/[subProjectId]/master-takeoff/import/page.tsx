"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  createMasterTakeoff,
  MasterTakeoffItem
} from "@/lib/services/MasterTakeoffService";

/**
 * Helper function to chunk a large string into smaller pieces.
 * We'll default to ~2500 characters each to keep GPT requests safe.
 */
function chunkString(str: string, size = 2500): string[] {
  const chunks: string[] = [];
  let current = 0;
  while (current < str.length) {
    chunks.push(str.slice(current, current + size));
    current += size;
  }
  return chunks;
}

export default function ImportMasterTakeoffPage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string; 
    projectId: string; 
    subProjectId: string;
  };
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [trades, setTrades] = useState(
    "Engineering,Architecture,Electrical,Mechanical,Plumbing,Sprinkler,Fire Alarm"
  );
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [name, setName] = useState("Imported Takeoff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleParse(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setParsedData(null);

    try {
      // 1) Split text into smaller chunks
      const raw = rawText.trim();
      if (!raw) throw new Error("Please paste your CSV/XLSX-like text first.");

      const tradesArr = trades.split(",").map((s) => s.trim());

      // We'll store the final results from all chunks
      const allItems: MasterTakeoffItem[] = [];

      // Break the raw text into ~2500-char chunks (you can adjust chunk size if needed)
      const chunks = chunkString(raw, 2500);
      console.log(`Chunking into ${chunks.length} piece(s).`);

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Parsing chunk ${i + 1} of ${chunks.length}...`);
        // 2) Call parse-master-takeoff for each chunk
        const res = await fetch("/api/parse-master-takeoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawTakeoff: chunks[i], trades: tradesArr }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Parse of chunk ${i + 1} failed`);
        }

        // Expect shape: { success: true, data: { items: [ ... ] } }
        if (!json.data || !Array.isArray(json.data.items)) {
          throw new Error(`Chunk ${i + 1} returned invalid structure`);
        }

        // Accumulate items
        allItems.push(...json.data.items);
      }

      // Merge results into a single object
      const final = { items: allItems };
      setParsedData(final);
    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (!parsedData || !parsedData.items || !Array.isArray(parsedData.items)) {
        alert("Nothing to save yet. Parse first!");
        return;
      }

      // 3) Create the Master Takeoff doc in Firestore
      const docId = await createMasterTakeoff(orgId, projectId, subProjectId, {
        name,
        items: parsedData.items,
      });

      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff/${docId}`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  }

  function handleCancel() {
    router.push(
      `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/master-takeoff`
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Import Master Takeoff (CSV -> GPT)</h1>
        <GrayButton onClick={handleCancel}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <form onSubmit={handleParse} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Paste CSV or XLSX-like text</label>
            <textarea
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              If the text is extremely long, it will be automatically split into smaller
              chunks for multiple GPT calls.
            </p>
          </div>

          <div>
            <label className="block font-medium mb-1">Trades (comma-separated)</label>
            <input
              className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
              value={trades}
              onChange={(e) => setTrades(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: Engineering, Architecture, Electrical, Mechanical, Plumbing,
              Sprinkler, Fire Alarm
            </p>
          </div>

          <GrayButton type="submit" disabled={loading}>
            {loading ? "Parsing..." : "Parse with ChatGPT"}
          </GrayButton>
        </form>
      </Card>

      {parsedData && parsedData.items && (
        <Card className="mt-4 space-y-2">
          <h2 className="text-lg font-semibold">Parse Result</h2>
          <label className="block font-medium mb-1">Name for This Takeoff</label>
          <input
            className="border p-2 w-full rounded bg-white dark:bg-neutral-800 dark:text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="max-h-64 overflow-auto border p-2 bg-gray-50 text-xs text-black">
            {JSON.stringify(parsedData.items, null, 2)}
          </div>

          <GrayButton onClick={handleSave}>Save to Firestore</GrayButton>
        </Card>
      )}
    </PageContainer>
  );
}
