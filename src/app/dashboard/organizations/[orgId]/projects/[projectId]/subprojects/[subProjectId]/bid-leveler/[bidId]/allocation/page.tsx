"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";

// Import UI components.
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// Import service functions and interfaces.
import { fetchBid, updateBid, BidDoc } from "@/lib/services/BidLevelerService";
import {
  fetchAllMasterTakeoffs,
  MasterTakeoffDoc,
} from "@/lib/services/MasterTakeoffService";

// Define a type alias for allocations.
interface Allocations {
  [key: string]: number;
}

/**
 * getItemKey
 *
 * Returns a valid key for a master takeoff item.
 * If the item has an id, we return it; otherwise we use the item's trade plus the index.
 */
function getItemKey(item: any, index: number): string {
  return item.id ? item.id : `${item.trade || "unknown"}-${index}`;
}

/**
 * BidAllocationPage
 *
 * This page lets you level a lump-sum bid against a master takeoff.
 * It loads the bid and master takeoffs, lets you select a master takeoff,
 * provides a multi-select filter populated by the unique trade names from the master takeoff (with an "All" option),
 * computes default (proportional) allocations over the filtered items (unless you manually edit them),
 * allows you to adjust individual allocated bid amounts,
 * displays totals and a pie chart visualization, and saves the final allocation breakdown.
 */
export default function BidAllocationPage() {
  const { orgId, projectId, subProjectId, bidId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    bidId: string;
  };
  const router = useRouter();

  // Local state.
  const [bid, setBid] = useState<BidDoc | null>(null);
  const [masters, setMasters] = useState<MasterTakeoffDoc[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [masterTakeoff, setMasterTakeoff] = useState<MasterTakeoffDoc | null>(null);
  const [allocations, setAllocations] = useState<Allocations>({});
  // selectedTrades: an array of trade strings; "All" is a special option.
  const [selectedTrades, setSelectedTrades] = useState<string[]>(["All"]);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load bid and master takeoffs.
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const fetchedBid = await fetchBid(orgId, projectId, subProjectId, bidId);
        setBid(fetchedBid);
        const masterDocs = await fetchAllMasterTakeoffs(orgId, projectId, subProjectId);
        setMasters(masterDocs);
      } catch (err: any) {
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId, projectId, subProjectId, bidId]);

  // When a master takeoff is selected, update masterTakeoff and set the trade filter.
  useEffect(() => {
    if (!selectedMasterId) {
      setMasterTakeoff(null);
      setAllocations({});
      setSelectedTrades(["All"]);
      setHasUserEdited(false);
      return;
    }
    const selected = masters.find((m) => m.id === selectedMasterId) || null;
    setMasterTakeoff(selected);
    setHasUserEdited(false);
    if (selected && selected.items.length > 0) {
      // Extract unique trades from the master takeoff items.
      const availableTrades = Array.from(
        new Set(selected.items.map((item) => String(item.trade).trim()))
      );
      console.log("Available trades from selected master:", availableTrades);
      // Default selection is "All" so that all items are shown.
      setSelectedTrades(["All"]);
    }
  }, [selectedMasterId, masters, bid]);

  // Compute default allocations if the user has not manually edited.
  useEffect(() => {
    if (!masterTakeoff || !bid || (bid.bidAmount ?? 0) === 0) {
      setAllocations({});
      return;
    }
    if (hasUserEdited) {
      console.log("User has manually edited allocations; skipping defaults.");
      return;
    }
    let filteredItems;
    if (selectedTrades.includes("All")) {
      filteredItems = masterTakeoff.items;
    } else {
      const tradesToFilter = selectedTrades.map((t) => t.trim());
      filteredItems = masterTakeoff.items.filter((item) => {
        const trade = String(item.trade || "").trim();
        return tradesToFilter.includes(trade);
      });
    }
    console.log("Filtered items for allocation:", filteredItems);
    if (filteredItems.length === 0) {
      setAllocations({});
      return;
    }
    const totalEstimated = filteredItems.reduce(
      (sum, item) => sum + Number(item.estimatedCost || 0),
      0
    );
    const newAllocations: Allocations = {};
    filteredItems.forEach((item, index) => {
      const defaultAlloc =
        totalEstimated > 0
          ? (Number(item.estimatedCost) / totalEstimated) * (bid.bidAmount ?? 0)
          : 0;
      const key = getItemKey(item, index);
      newAllocations[key] = parseFloat(defaultAlloc.toFixed(2));
    });
    console.log("Default allocations computed:", newAllocations);
    setAllocations(newAllocations);
  }, [selectedTrades, masterTakeoff, bid, hasUserEdited]);

  // Calculate totals.
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const bidTotal = bid?.bidAmount ?? 0;
  const difference = bidTotal - totalAllocated;

  // Filter items for rendering.
  const filteredItems =
    masterTakeoff && !selectedTrades.includes("All")
      ? masterTakeoff.items.filter((item, index) => {
          const trade = String(item.trade || "").trim();
          return selectedTrades.includes(trade);
        })
      : masterTakeoff?.items || [];
  console.log("Rendering filtered items:", filteredItems);

  // Prepare pie chart data.
  const pieData = {
    labels: filteredItems.map((item, index) =>
      item.description ? item.description : `Item ${index + 1}`
    ),
    datasets: [
      {
        data: filteredItems.map((item, index) => {
          const key = getItemKey(item, index);
          return allocations[key] || 0;
        }),
        backgroundColor: filteredItems.map((_, index) => {
          const vibrantColors = [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#66FF66",
            "#FF66CC",
          ];
          return vibrantColors[index % vibrantColors.length];
        }),
        hoverBackgroundColor: filteredItems.map((_, index) => {
          const vibrantColors = [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#66FF66",
            "#FF66CC",
          ];
          return vibrantColors[index % vibrantColors.length];
        }),
      },
    ],
  };

  const pieOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#FFFFFF",
        },
      },
    },
  };

  // When a user manually changes an allocation, update that item's allocation.
  function handleAllocationChange(key: string, value: string) {
    setHasUserEdited(true);
    const num = parseFloat(value);
    setAllocations((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
    console.log(`Allocation for ${key} updated to: ${value}`);
  }

  // Save allocations to Firestore.
  async function handleSaveAllocations() {
    if (!bid) return;
    try {
      setLoading(true);
      // Build breakdown using all items (if "All" is selected) or only filtered ones.
      const breakdown =
        (masterTakeoff?.items || [])
          .filter((item) => {
            const trade = String(item.trade || "").trim();
            if (selectedTrades.includes("All")) return true;
            return selectedTrades.includes(trade);
          })
          .map((item, index) => {
            const key = getItemKey(item, index);
            return {
              masterItemId: key,
              allocatedCost: allocations[key] || 0,
            };
          }) || [];
      await updateBid(orgId, projectId, subProjectId, bid.id, {
        allocatedBreakdown: breakdown,
      });
      alert("Allocations saved!");
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/bid-leveler/${bid.id}/leveling`
      );
    } catch (err: any) {
      setError(err.message || "Failed to save allocations.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageContainer>Loading...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;
  if (!bid) return <PageContainer>No Bid found.</PageContainer>;

  // Compute available trades from the master takeoff.
  const availableTrades = masterTakeoff
    ? Array.from(
        new Set(
          masterTakeoff.items
            .map((item) => String(item.trade || "").trim())
            .filter(Boolean)
        )
      )
    : [];
  // Build the trade filter options with "All" at the front.
  const tradesForFilter = ["All", ...availableTrades];
  console.log("Available trades for filter:", tradesForFilter);
  console.log("Currently selected trades:", selectedTrades);

  return (
    <PageContainer className="bg-gray-800 text-white min-h-screen">
      {/* Top Navigation and Title */}
      <div className="flex items-center justify-between mb-4 p-4">
        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold">Bid Leveling Allocation</h1>
      </div>

      <Card className="bg-gray-700 text-white p-6">
        {/* Bid Summary */}
        <div className="mb-4">
          <p className="text-sm">
            Bid from: <strong>{bid.contractor}</strong> for <strong>{bid.trade}</strong>{" "}
            with a total bid of <strong>${bidTotal.toLocaleString()}</strong>
          </p>
        </div>

        {/* Master Takeoff Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Master Takeoff:</label>
          <select
            className="border p-2 rounded text-black w-full"
            value={selectedMasterId}
            onChange={(e) => {
              console.log("Master takeoff selected:", e.target.value);
              setSelectedMasterId(e.target.value);
            }}
          >
            <option value="">-- Select Master Takeoff --</option>
            {masters.map((m, index) => (
              <option key={m.id || index} value={m.id}>
                {m.name || m.id} ({m.items.length} items)
              </option>
            ))}
          </select>
        </div>

        {/* Trade Filtering (Multi-select) */}
        {masterTakeoff && tradesForFilter.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Filter Master Items by Trade:
            </label>
            <select
              multiple
              className="border p-2 rounded text-black w-full"
              value={selectedTrades}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions).map(
                  (option) => option.value
                );
                console.log("New selected trades:", selectedOptions);
                setSelectedTrades(selectedOptions);
                setHasUserEdited(false);
              }}
            >
              {tradesForFilter.map((trade, index) => (
                <option key={trade || index} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-300 mt-1">
              Hold down Ctrl (Windows) or Cmd (Mac) to select multiple trades.
            </p>
          </div>
        )}

        {/* Allocation Table */}
        {masterTakeoff && filteredItems.length > 0 && (
          <>
            <div className="mb-4">
              <p className="text-sm">
                Total Estimated Cost from Master Takeoff (Filtered): $
                {filteredItems
                  .reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0)
                  .toLocaleString()}
              </p>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-600">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="border px-2 py-1">Item Description</th>
                    <th className="border px-2 py-1">Estimated Cost</th>
                    <th className="border px-2 py-1">Allocated Bid Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700">
                  {filteredItems.map((item, index) => {
                    const key = getItemKey(item, index);
                    return (
                      <tr key={key} className="hover:bg-gray-600">
                        <td className="border px-2 py-1">{item.description || key}</td>
                        <td className="border px-2 py-1 text-right">
                          ${Number(item.estimatedCost).toLocaleString()}
                        </td>
                        <td className="border px-2 py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={
                              allocations[key] !== undefined
                                ? allocations[key].toString()
                                : ""
                            }
                            onChange={(e) => handleAllocationChange(key, e.target.value)}
                            className="w-full p-1 text-black border rounded"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals and Difference */}
            <div className="mb-4 border p-2 rounded">
              <p className="text-sm">
                <strong>Total Allocated:</strong> ${totalAllocated.toLocaleString()}
              </p>
              <p className="text-sm">
                <strong>Difference (Bid Total - Allocated):</strong> $
                {difference.toLocaleString()}
              </p>
            </div>

            {/* Pie Chart Visualization */}
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">Allocation Distribution</h2>
              <div className="w-full h-[600px]">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>

            {/* Save Button */}
            <GrayButton onClick={handleSaveAllocations}>Save Allocations</GrayButton>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
