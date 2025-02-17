// src/app/dashboard/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// Import Chart.js components via react-chartjs-2.
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Register Chart.js components.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Define the interface for our analytics data.
interface AnalyticsData {
  timeslot_id: number;
  location: string;
  date: string;
  timeslot: string;
  total_tickets: number;
  remaining_tickets: number;
  sold_tickets: number;
  last_updated: string; // Using string for simplicity
}

export default function AnalyticsPage() {
  // State variables for analytics data, selected date, selected location, loading, error, and totalSold.
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("2025-02-17"); // Default specific date
  const [selectedLocation, setSelectedLocation] = useState<string>("All"); // Default location filter
  const [totalSold, setTotalSold] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch analytics data whenever selectedDate or selectedLocation changes.
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        let url = `/api/analytics?date=${encodeURIComponent(selectedDate)}`;
        if (selectedLocation !== "All") {
          url += `&location=${encodeURIComponent(selectedLocation)}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Failed to fetch analytics data.");
        }
        const json = await res.json();
        setAnalyticsData(json.data);
        setTotalSold(json.totalSold);
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDate, selectedLocation]);

  // Prepare the data for the line chart (Ticket Sales Over Time).
  const lineChartData = {
    labels: analyticsData.map((item) => item.timeslot),
    datasets: [
      {
        label: "Ticket Sales",
        data: analyticsData.map((item) => item.sold_tickets),
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
      },
    ],
  };

  // Compute sales by location for the donut chart.
  const salesByLocation = analyticsData.reduce((acc, item) => {
    acc[item.location] = (acc[item.location] || 0) + item.sold_tickets;
    return acc;
  }, {} as Record<string, number>);

  const donutChartData = {
    labels: Object.keys(salesByLocation),
    datasets: [
      {
        data: Object.values(salesByLocation),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
      },
    ],
  };

  // Handlers for date and location changes.
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocation(e.target.value);
  };

  return (
    <PageContainer className="max-w-full">
      <h1 className="text-2xl font-bold mt-4">Analytics Dashboard</h1>

      {/* Selection Controls */}
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="border p-2 rounded bg-white text-black"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="font-medium">Select Location:</label>
            <select
              value={selectedLocation}
              onChange={handleLocationChange}
              className="border p-2 rounded bg-white text-black"
            >
              <option value="All">All</option>
              <option value="Flatiron">Flatiron</option>
              <option value="Williamsburg">Williamsburg</option>
            </select>
          </div>
          <GrayButton
            onClick={() => {
              /* Manual refresh if needed */
            }}
          >
            Refresh
          </GrayButton>
        </div>
      </Card>

      {loading ? (
        <p className="mt-4">Loading analytics data...</p>
      ) : error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : (
        <>
          {/* Total Ticket Sales */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold">Total Ticket Sales: {totalSold}</h2>
          </Card>

          {/* Detailed Table */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Ticket Sales by Time Slot</h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-800">
                  {selectedLocation === "All" && (
                    <th className="p-4 border-b text-left uppercase tracking-wider">
                      Location
                    </th>
                  )}
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Time Slot
                  </th>
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Total Tickets
                  </th>
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Sold Tickets
                  </th>
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Remaining Tickets
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.map((item) => (
                  <tr
                    key={item.timeslot_id}
                    className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-700 dark:even:bg-gray-600"
                  >
                    {selectedLocation === "All" && (
                      <td className="p-4 border-b">{item.location}</td>
                    )}
                    <td className="p-4 border-b">{item.timeslot}</td>
                    <td className="p-4 border-b">{item.total_tickets}</td>
                    <td className="p-4 border-b">{item.sold_tickets}</td>
                    <td className="p-4 border-b">{item.remaining_tickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Line Chart: Ticket Sales Over Time */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Ticket Sales Over Time</h2>
            <Line data={lineChartData} />
          </Card>

          {/* Donut Chart: Sales Distribution by Location (only for All locations) */}
          {selectedLocation === "All" && (
            <Card className="mt-4 p-4 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-4">Sales Distribution by Location</h2>
              <Doughnut data={donutChartData} />
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}
