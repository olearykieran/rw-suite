// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/ticket-sales-report/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { auth } from "@/lib/firebaseConfig";
import { generatePublicTicketSalesReportLink } from "@/lib/utils/publicLinks";

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

// Update the interface to include timeslots information
interface TimeslotData {
  timeslot: string;
  total_tickets: number;
  sold_tickets: number;
  revenue: number;
}

interface DailySalesData {
  date: string;
  location: string;
  total_tickets: number;
  sold_tickets: number;
  revenue: number;
  timeslots?: TimeslotData[]; // Optional array of timeslot data for Othership
}

export default function TicketSalesReportPage() {
  const [user] = useAuthState(auth);
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
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const [shareSuccess, setShareSuccess] = useState(false);

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

  // Calculate metrics for Othership location
  const getOthershipMetrics = () => {
    if (selectedLocation !== "All") return null;

    const othershipData = reportData.filter((item) => item.location === "Othership");
    if (othershipData.length === 0) return null;

    const totalTickets = othershipData.reduce(
      (sum, item) => sum + Number(item.total_tickets),
      0
    );
    const soldTickets = othershipData.reduce(
      (sum, item) => sum + Number(item.sold_tickets),
      0
    );
    const revenue = othershipData.reduce((sum, item) => sum + Number(item.revenue), 0);

    return {
      totalTickets,
      soldTickets,
      revenue,
      occupancy: totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0,
    };
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

  // Handler for sharing the ticket sales report
  const handleShareReport = () => {
    const publicLink = generatePublicTicketSalesReportLink(
      orgId,
      projectId,
      subProjectId
    );
    navigator.clipboard.writeText(publicLink).then(
      () => {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <PageContainer className="max-w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mt-4">Ticket Sales Report</h1>
        {user && (
          <button
            onClick={handleShareReport}
            className="flex items-center px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            {shareSuccess ? "✓ Link Copied!" : "Share"}
          </button>
        )}
      </div>

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
              <option value="Othership">Othership</option>
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
              <h2 className="text-xl font-bold mb-2">Total Ticket Sales</h2>
              <p className="text-3xl font-bold">{totalSales.toLocaleString()}</p>
            </Card>
            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-2">Total Revenue</h2>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            </Card>
            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-2">Projected Yearly Revenue</h2>
              <p className="text-3xl font-bold">
                {formatCurrency(projectedYearlyRevenue)}
              </p>
            </Card>
          </div>

          {/* Othership Summary Card (only when All locations selected) */}
          {selectedLocation === "All" && getOthershipMetrics() && (
            <Card className="mt-4 p-4 shadow-lg rounded-lg border-l-4 border-blue-500">
              <h2 className="text-xl font-bold mb-4">Othership Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">Total Capacity</h3>
                  <p className="text-2xl font-bold">
                    {getOthershipMetrics()?.totalTickets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Tickets Sold</h3>
                  <p className="text-2xl font-bold">
                    {getOthershipMetrics()?.soldTickets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Revenue</h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(getOthershipMetrics()?.revenue || 0)}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Occupancy Rate</h3>
                  <p className="text-2xl font-bold">
                    {getOthershipMetrics()?.occupancy.toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Bar Chart: Daily Revenue */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Daily Revenue</h2>
            <Bar data={barChartData} />
          </Card>

          {/* Timeslot Breakdown for Othership */}
          {selectedLocation === "Othership" &&
            reportData.some((item) => item.timeslots && item.timeslots.length > 0) && (
              <Card className="mt-4 p-4 shadow-lg rounded-lg overflow-x-auto">
                <h2 className="text-xl font-bold mb-4">Othership Timeslot Breakdown</h2>
                {reportData.map((dayData, dayIndex) => (
                  <div key={dayIndex} className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      {formatDate(dayData.date)}
                    </h3>
                    <table className="min-w-full border-collapse mb-4">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-800">
                          <th className="p-3 border-b text-left uppercase tracking-wider">
                            Time Slot
                          </th>
                          <th className="p-3 border-b text-left uppercase tracking-wider">
                            Total Capacity
                          </th>
                          <th className="p-3 border-b text-left uppercase tracking-wider">
                            Tickets Sold
                          </th>
                          <th className="p-3 border-b text-left uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="p-3 border-b text-left uppercase tracking-wider">
                            % Full
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayData.timeslots &&
                          dayData.timeslots.map((slot, slotIndex) => (
                            <tr
                              key={slotIndex}
                              className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-700 dark:even:bg-gray-600"
                            >
                              <td className="p-3 border-b">{slot.timeslot}</td>
                              <td className="p-3 border-b">{slot.total_tickets}</td>
                              <td className="p-3 border-b">{slot.sold_tickets}</td>
                              <td className="p-3 border-b">
                                {formatCurrency(slot.revenue)}
                              </td>
                              <td className="p-3 border-b">
                                {slot.total_tickets > 0 ? (
                                  <div className="flex items-center space-x-2">
                                    <span>
                                      {(
                                        (slot.sold_tickets / slot.total_tickets) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </span>
                                    <div className="w-24 bg-gray-300 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          slot.sold_tickets / slot.total_tickets >= 0.9
                                            ? "bg-green-500"
                                            : slot.sold_tickets / slot.total_tickets >=
                                              0.7
                                            ? "bg-blue-500"
                                            : slot.sold_tickets / slot.total_tickets >=
                                              0.4
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            (slot.sold_tickets / slot.total_tickets) * 100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-200 dark:bg-gray-800 font-bold">
                          <td className="p-3 border-b">DAILY TOTAL</td>
                          <td className="p-3 border-b">{dayData.total_tickets}</td>
                          <td className="p-3 border-b">{dayData.sold_tickets}</td>
                          <td className="p-3 border-b">
                            {formatCurrency(dayData.revenue)}
                          </td>
                          <td className="p-3 border-b">
                            {dayData.total_tickets > 0 ? (
                              <div className="flex items-center space-x-2">
                                <span>
                                  {(
                                    (dayData.sold_tickets / dayData.total_tickets) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                                <div className="w-24 bg-gray-300 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      dayData.sold_tickets / dayData.total_tickets >= 0.9
                                        ? "bg-green-500"
                                        : dayData.sold_tickets / dayData.total_tickets >=
                                          0.7
                                        ? "bg-blue-500"
                                        : dayData.sold_tickets / dayData.total_tickets >=
                                          0.4
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (dayData.sold_tickets / dayData.total_tickets) *
                                          100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </Card>
            )}

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
