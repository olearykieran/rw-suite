// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/ticket-sales-report/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";

// Import Chart.js components via react-chartjs-2
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define the interface for our ticket sales report data
interface DailySalesData {
  date: string;
  location: string;
  total_tickets: number;
  sold_tickets: number;
  revenue: number;
}

export default function TicketSalesReportPage() {
  // State variables for report data, date range, selected location, loading, error, and totals
  const [reportData, setReportData] = useState<DailySalesData[]>([]);
  const [startDate, setStartDate] = useState<string>("2025-02-17");
  const [endDate, setEndDate] = useState<string>("2025-03-05");
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [projectedYearlyRevenue, setProjectedYearlyRevenue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch report data whenever startDate, endDate, or selectedLocation changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        let url = `/api/ticket-sales-report?startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}`;

        if (selectedLocation !== "All") {
          url += `&location=${encodeURIComponent(selectedLocation)}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Failed to fetch ticket sales report data.");
        }

        const json = await res.json();
        setReportData(json.data);
        setTotalSales(json.totalSales);
        setTotalRevenue(json.totalRevenue);
        setProjectedYearlyRevenue(json.projectedYearlyRevenue);
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate, selectedLocation]);

  // Format date for display (YYYY-MM-DD to MM/DD/YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US");
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Prepare the data for the bar chart (Daily Revenue)
  const barChartData = {
    labels: reportData.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: "Daily Revenue",
        data: reportData.map((item) => item.revenue),
        backgroundColor: "rgba(75,192,192,0.6)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
      },
    ],
  };

  // Handlers for date and location changes
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocation(e.target.value);
  };

  return (
    <PageContainer className="max-w-full">
      <h1 className="text-2xl font-bold mt-4">Ticket Sales Report</h1>

      {/* Selection Controls */}
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="font-medium">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="border p-2 rounded bg-white text-black"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="font-medium">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="border p-2 rounded bg-white text-black"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="font-medium">Location:</label>
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
        <p className="mt-4">Loading report data...</p>
      ) : error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-lg font-semibold text-gray-600">Total Tickets Sold</h2>
              <p className="text-3xl font-bold mt-2">{totalSales}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </Card>

            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-lg font-semibold text-gray-600">Total Revenue</h2>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </Card>

            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-lg font-semibold text-gray-600">
                Projected Yearly Revenue
              </h2>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(projectedYearlyRevenue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Based on current sales trend</p>
            </Card>
          </div>

          {/* Bar Chart: Daily Revenue */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Daily Revenue</h2>
            <Bar data={barChartData} />
          </Card>

          {/* Detailed Table */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Daily Sales Breakdown</h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-800">
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Date
                  </th>
                  {selectedLocation === "All" && (
                    <th className="p-4 border-b text-left uppercase tracking-wider">
                      Location
                    </th>
                  )}
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Total Tickets
                  </th>
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Sold Tickets
                  </th>
                  <th className="p-4 border-b text-left uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, index) => (
                  <tr
                    key={index}
                    className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-700 dark:even:bg-gray-600"
                  >
                    <td className="p-4 border-b">{formatDate(item.date)}</td>
                    {selectedLocation === "All" && (
                      <td className="p-4 border-b">{item.location}</td>
                    )}
                    <td className="p-4 border-b">{item.total_tickets}</td>
                    <td className="p-4 border-b">{item.sold_tickets}</td>
                    <td className="p-4 border-b">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 dark:bg-gray-800 font-bold">
                  <td className="p-4 border-b">TOTAL</td>
                  {selectedLocation === "All" && <td className="p-4 border-b"></td>}
                  <td className="p-4 border-b">
                    {reportData.reduce(
                      (sum, item) => sum + Number(item.total_tickets),
                      0
                    )}
                  </td>
                  <td className="p-4 border-b">{totalSales}</td>
                  <td className="p-4 border-b">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
