"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";

// Import Chart and the datalabels plugin and register it.
import { Chart } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
Chart.register(ChartDataLabels);

import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

import {
  fetchMasterTakeoff,
  MasterTakeoffDoc,
} from "@/lib/services/MasterTakeoffService";

/**
 * TakeoffReportingPage
 *
 * This page fetches a single Master Takeoff document (using the provided takeoffId)
 * and then computes a cost breakdown by trade based on the items array.
 * It displays the total cost for each trade and a grand total for the project.
 * Additionally, a pie chart visualization is added below the breakdown table,
 * with vibrant colors and abbreviated labels for clarity.
 */
export default function TakeoffReportingPage() {
  // Get route parameters (orgId, projectId, subProjectId, and takeoffId)
  const { orgId, projectId, subProjectId, takeoffId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
    takeoffId: string;
  };
  const router = useRouter();

  // Local state to hold the takeoff document, report data, and UI states.
  const [takeoff, setTakeoff] = useState<MasterTakeoffDoc | null>(null);
  const [reportData, setReportData] = useState<{ [trade: string]: number }>({});
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Define a vibrant color palette for the pie chart.
  const vibrantColors = [
    "#FF6384", // vibrant red/pink
    "#36A2EB", // vibrant blue
    "#FFCE56", // vibrant yellow
    "#4BC0C0", // vibrant green
    "#9966FF", // vibrant purple
    "#FF9F40", // vibrant orange
    "#66FF66", // bright green
    "#FF66CC", // bright pink
  ];

  // Fetch the takeoff data and compute the breakdown.
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Fetch the master takeoff document using our service layer.
        const doc = await fetchMasterTakeoff(orgId, projectId, subProjectId, takeoffId);
        setTakeoff(doc);

        // Initialize an object to hold the sum per trade.
        const tradeSums: { [trade: string]: number } = {};
        let overallTotal = 0;

        // Loop through each item and sum the estimatedCost by trade.
        doc.items.forEach((item) => {
          // Use a fallback for trade if none is provided.
          const trade = item.trade || "Uncategorized";
          const cost = item.estimatedCost || 0;
          if (tradeSums[trade] === undefined) {
            tradeSums[trade] = 0;
          }
          tradeSums[trade] += cost;
          overallTotal += cost;
        });

        // Update state with the computed values.
        setReportData(tradeSums);
        setTotalCost(overallTotal);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load takeoff for reporting");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, projectId, subProjectId, takeoffId]);

  // Prepare data for the Pie chart.
  const pieData = {
    labels: Object.keys(reportData),
    datasets: [
      {
        data: Object.values(reportData),
        backgroundColor: Object.keys(reportData).map(
          (_, index) => vibrantColors[index % vibrantColors.length]
        ),
        hoverBackgroundColor: Object.keys(reportData).map(
          (_, index) => vibrantColors[index % vibrantColors.length]
        ),
      },
    ],
  };

  // Options for the Pie chart.
  const pieOptions = {
    plugins: {
      legend: {
        labels: {
          color: "#FFFFFF", // white legend text for readability on dark background
        },
      },
      datalabels: {
        color: "#000000", // use black text for data labels
        formatter: (value: any, context: any) => {
          const label = context.chart.data.labels[context.dataIndex] as string;
          // Create abbreviation: if multiple words, take the first letter of each;
          // otherwise, take up to the first 4 characters.
          const words = label.split(" ");
          if (words.length > 1) {
            return words
              .map((w) => w.charAt(0))
              .join("")
              .toUpperCase();
          } else {
            return label.length > 4
              ? label.substring(0, 4).toUpperCase()
              : label.toUpperCase();
          }
        },
        font: {
          weight: "bold",
          size: 14,
        },
      },
    },
    maintainAspectRatio: false, // allows the container to control chart dimensions
  };

  // Handle loading and error states.
  if (loading) return <PageContainer>Loading Reporting...</PageContainer>;
  if (error) return <PageContainer>{error}</PageContainer>;
  if (!takeoff) return <PageContainer>No takeoff data found.</PageContainer>;

  return (
    <PageContainer className="bg-gray-800 text-white min-h-screen">
      {/* Back button */}
      <div className="flex items-center justify-between mb-4 p-4">
        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 rounded-xl text-sm"
        >
          &larr; Back
        </button>
      </div>

      <Card className="bg-gray-700 text-white p-6">
        {/* Page header */}
        <h1 className="text-2xl font-bold mb-4">
          Reporting for {takeoff.name || takeoff.id}
        </h1>

        {/* Reporting table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Trade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-600">
              {Object.entries(reportData).map(([trade, cost]) => (
                <tr key={trade}>
                  <td className="px-6 py-4 whitespace-nowrap">{trade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    $
                    {cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="px-6 py-4 whitespace-nowrap">Grand Total</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  $
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pie Chart */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Cost Distribution</h2>
          {/* Increased container size for a larger chart */}
          <div className="w-full h-[600px]">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
