"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { createLightingSchedule } from "@/lib/services/LightingScheduleService";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";

// Import pricing service functions to prefill and update prices.
import {
  getFixturePrice,
  updateFixturePrice,
} from "@/lib/services/LightingPricingService";

/**
 * NewLightingSchedulePage
 *
 * This page allows users to upload a lighting schedule PDF.
 * The file is sent to our PDF parser API to extract raw text.
 * Then, the raw text is sent to our GPT API endpoint to parse the lighting schedule.
 * The parsed results are displayed in a table (with an extra column for "User Price")
 * and a pie chart. The user can manually enter or update the price for each item.
 * Additionally, if no price is entered, the system will attempt to prefill the price
 * from the pricing database.
 */
export default function NewLightingSchedulePage() {
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [name, setName] = useState("New Lighting Schedule");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper: For a list of items, prefill userPrice from Firebase pricing data.
  async function prefillUserPrices(items: any[]): Promise<any[]> {
    // Get distinct fixture types (lowercased) from items.
    const distinctTypes = Array.from(
      new Set(
        items.map((item) =>
          item.fixtureType ? item.fixtureType.toLowerCase().trim() : ""
        )
      )
    ).filter((t) => t !== "");

    const priceMapping: Record<string, number> = {};
    for (const fixtureType of distinctTypes) {
      try {
        const price = await getFixturePrice(fixtureType);
        priceMapping[fixtureType] = price;
      } catch (error) {
        console.error(`Failed to fetch price for ${fixtureType}`, error);
        priceMapping[fixtureType] = 0;
      }
    }
    // Update each item if userPrice is empty.
    return items.map((item) => {
      const type = item.fixtureType ? item.fixtureType.toLowerCase().trim() : "";
      if (!item.userPrice || item.userPrice === "") {
        return {
          ...item,
          userPrice: priceMapping[type] !== undefined ? priceMapping[type] : "",
        };
      }
      return item;
    });
  }

  // Prepare pie chart data based on fixture types and quantities.
  const getPieChartData = () => {
    if (!parsedData || !parsedData.items) return null;
    const counts: { [key: string]: number } = {};
    parsedData.items.forEach((item: any) => {
      const type = item.fixtureType || "Unknown";
      counts[type] = (counts[type] || 0) + (item.quantity || 1);
    });
    const labels = Object.keys(counts);
    const dataValues = labels.map((label) => counts[label]);
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
    return {
      labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: labels.map(
            (_, index) => vibrantColors[index % vibrantColors.length]
          ),
        },
      ],
    };
  };

  // Handler for file upload change.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }

  // Process the PDF: call the /api/parse-pdf endpoint and then the lighting schedule parser.
  async function handleParse() {
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Create FormData and append the file.
      const formData = new FormData();
      formData.append("file", file);

      // Call the PDF parser API endpoint.
      const pdfResponse = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const pdfJson = await pdfResponse.json();
      if (!pdfResponse.ok || !pdfJson.success) {
        throw new Error(pdfJson.error || "Failed to parse PDF");
      }
      const extractedText = pdfJson.text;
      setRawText(extractedText);

      // Call the lighting schedule parser API endpoint.
      const parseResponse = await fetch("/api/parse-lighting-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLightingText: extractedText }),
      });
      const parseJson = await parseResponse.json();
      if (!parseResponse.ok || !parseJson.success) {
        throw new Error(parseJson.error || "Failed to parse lighting schedule");
      }
      // Initialize each item with a userPrice field (empty string).
      const itemsWithUserPrice = parseJson.data.items.map((item: any) => ({
        ...item,
        userPrice: item.userPrice ?? "",
      }));
      // Prefill userPrice for each fixture type based on stored pricing data.
      const itemsPrefilled = await prefillUserPrices(itemsWithUserPrice);
      setParsedData({ ...parseJson.data, items: itemsPrefilled });
    } catch (err: any) {
      console.error("Parse error:", err);
      setError(err.message || "Parsing failed");
    } finally {
      setLoading(false);
    }
  }

  // Handler to update the user price for a given item in local state.
  function handleUserPriceChange(index: number, value: string) {
    if (!parsedData || !parsedData.items) return;
    const newItems = [...parsedData.items];
    newItems[index] = { ...newItems[index], userPrice: value };
    setParsedData({ ...parsedData, items: newItems });
  }

  // Handler for the "Save Price" button on a row.
  async function handleSavePrice(index: number) {
    if (!parsedData || !parsedData.items) return;
    const item = parsedData.items[index];
    if (!item.fixtureType) {
      alert("Fixture type missing; cannot save price.");
      return;
    }
    if (!item.userPrice || isNaN(Number(item.userPrice))) {
      alert("Please enter a valid price.");
      return;
    }
    try {
      await updateFixturePrice(item.fixtureType, parseFloat(item.userPrice));
      alert(`Price for ${item.fixtureType} updated successfully!`);
    } catch (err: any) {
      console.error("Failed to update price:", err);
      alert("Error updating price.");
    }
  }

  // Save the parsed schedule (including user pricing) to Firestore.
  async function handleSave() {
    if (!parsedData || !parsedData.items) {
      alert("No parsed data to save. Please parse the schedule first.");
      return;
    }
    try {
      setLoading(true);

      // Save the lighting schedule document along with the user-entered pricing.
      const scheduleId = await createLightingSchedule(orgId, projectId, subProjectId, {
        name,
        rawText,
        parsedData, // includes userPrice values
      });
      alert("Lighting Schedule saved!");
      router.push(
        `/dashboard/organizations/${orgId}/projects/${projectId}/subprojects/${subProjectId}/lighting-schedule/${scheduleId}`
      );
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save lighting schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="bg-gray-800 text-white min-h-screen">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">New Lighting Schedule</h1>
        <GrayButton onClick={() => router.back()}>Cancel</GrayButton>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card className="bg-gray-700 text-white p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleParse();
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Schedule Name</label>
            <input
              type="text"
              className="border p-2 w-full rounded bg-gray-600 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Upload PDF File</label>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
          </div>
          <GrayButton type="submit" disabled={loading}>
            {loading ? "Parsing..." : "Parse Lighting Schedule"}
          </GrayButton>
        </form>
      </Card>

      {parsedData && parsedData.items && (
        <Card className="bg-gray-700 text-white mt-4 p-6">
          <h2 className="text-xl font-bold mb-2">Parsed Lighting Schedule</h2>
          {/* Table of parsed items with dark theme and a "User Price" column */}
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-600">
              <thead className="bg-gray-600">
                <tr>
                  <th className="border px-2 py-1">Fixture Type</th>
                  <th className="border px-2 py-1">Location</th>
                  <th className="border px-2 py-1">Quantity</th>
                  <th className="border px-2 py-1">Manufacturer</th>
                  <th className="border px-2 py-1">Control Method</th>
                  <th className="border px-2 py-1">Estimated Cost</th>
                  <th className="border px-2 py-1">User Price</th>
                  <th className="border px-2 py-1">Save Price</th>
                </tr>
              </thead>
              <tbody className="bg-gray-700">
                {parsedData.items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-600">
                    <td className="border px-2 py-1">{item.fixtureType || "-"}</td>
                    <td className="border px-2 py-1">{item.location || "-"}</td>
                    <td className="border px-2 py-1 text-right">{item.quantity || 0}</td>
                    <td className="border px-2 py-1">{item.manufacturer || "-"}</td>
                    <td className="border px-2 py-1">{item.controlMethod || "-"}</td>
                    <td className="border px-2 py-1 text-right">
                      {item.estimatedCost !== undefined
                        ? `$${Number(item.estimatedCost).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={item.userPrice !== undefined ? item.userPrice : ""}
                        onChange={(e) => handleUserPriceChange(index, e.target.value)}
                        className="w-full p-1 text-black border rounded"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <GrayButton
                        onClick={() => handleSavePrice(index)}
                        className="text-xs p-1"
                      >
                        Save Price
                      </GrayButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pie Chart Visualization */}
          {getPieChartData() && (
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">Fixture Distribution</h3>
              <div className="w-full h-[400px]">
                <Pie data={getPieChartData()} />
              </div>
            </div>
          )}

          <GrayButton onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Lighting Schedule"}
          </GrayButton>
        </Card>
      )}
    </PageContainer>
  );
}
