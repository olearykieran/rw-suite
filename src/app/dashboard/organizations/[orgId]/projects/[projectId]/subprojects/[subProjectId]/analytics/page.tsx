// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { GrayButton } from "@/components/ui/GrayButton";
import { generatePublicAnalyticsLink } from "@/lib/utils/publicLinks";

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

/**
 * Helper function to parse a timeslot string into minutes since midnight.
 * Expected timeslot formats:
 * - "9 AM"
 * - "10:30 PM"
 * This allows proper numerical sorting of the timeslots.
 *
 * @param timeslot The timeslot string to parse.
 * @returns The total minutes since midnight.
 */
function parseTimeslot(timeslot: string): number {
  const trimmed = timeslot.trim().toUpperCase();
  // Regex to capture hour, optional minute, and period (AM/PM)
  const match = trimmed.match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/);
  if (!match) {
    // If parsing fails, return Infinity to sort this entry last.
    return Infinity;
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  // Convert to 24-hour format
  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }
  return hour * 60 + minute;
}

export default function AnalyticsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { orgId, projectId, subProjectId } = useParams() as {
    orgId: string;
    projectId: string;
    subProjectId: string;
  };
  const router = useRouter();

  // State variables for analytics data, selected date, selected location, loading, error, and totalSold.
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("2025-02-17"); // Default specific date
  const [selectedLocation, setSelectedLocation] = useState<string>("All"); // Default location filter
  const [totalSold, setTotalSold] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [shareSuccess, setShareSuccess] = useState(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  console.log("Analytics page rendering", {
    user,
    authLoading,
    orgId,
    projectId,
    subProjectId,
  });

  // Fetch analytics data whenever selectedDate or selectedLocation changes.
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        // Choose API endpoint based on authentication state
        const baseUrl = user ? `/api/analytics` : `/api/public/analytics`;

        let url = `${baseUrl}?date=${encodeURIComponent(
          selectedDate
        )}&orgId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(
          projectId
        )}&subProjectId=${encodeURIComponent(subProjectId)}`;

        if (selectedLocation !== "All") {
          url += `&location=${encodeURIComponent(selectedLocation)}`;
        }

        console.log("Fetching analytics data from:", url);
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error("Failed to fetch analytics data.");
        }

        const json = await res.json();
        setAnalyticsData(json.data);
        setTotalSold(json.totalSold);
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        setError(err.message || "An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDate, selectedLocation, orgId, projectId, subProjectId, user]);

  // Create a sorted copy of analyticsData based on the parsed timeslot.
  const sortedAnalyticsData = [...analyticsData].sort((a, b) => {
    return parseTimeslot(a.timeslot) - parseTimeslot(b.timeslot);
  });

  // Prepare the data for the line chart (Ticket Sales Over Time) using sorted data.
  const lineChartData = {
    labels: sortedAnalyticsData.map((item) => item.timeslot),
    datasets: [
      {
        label: "Ticket Sales",
        data: sortedAnalyticsData.map((item) => item.sold_tickets),
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

  // Handler for sharing the analytics page
  const handleShareAnalytics = () => {
    const publicLink = generatePublicAnalyticsLink(orgId, projectId, subProjectId);
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

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Check for theme preference on mount
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      // Default to dark mode if no preference or if preference is "dark"
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      if (!theme) {
        localStorage.setItem("theme", "dark");
      }
    }
  }, []);

  return (
    <PageContainer className="max-w-full">
      {/* Header with theme toggle */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          {user && (
            <button
              onClick={handleShareAnalytics}
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
              Share
            </button>
          )}
        </div>
      </div>

      {/* Only show navigation buttons for authenticated users */}
      {user && (
        <div className="flex items-center justify-between mb-4">
          <GrayButton onClick={() => router.back()}>&larr; Back</GrayButton>
          <div className="flex space-x-2">
            <GrayButton onClick={handleShareAnalytics}>
              {shareSuccess ? "✓ Link Copied!" : "Share Analytics"}
            </GrayButton>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-200">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-200">Select Location:</label>
            <select
              value={selectedLocation}
              onChange={handleLocationChange}
              className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="All">All</option>
              <option value="Flatiron">Flatiron</option>
              <option value="Williamsburg">Williamsburg</option>
            </select>
          </div>
          <GrayButton
            onClick={() => {
              // Manually refresh data by triggering a state change
              setSelectedDate(selectedDate);
            }}
          >
            Refresh
          </GrayButton>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mt-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <>
          {/* Total Ticket Sales */}
          <Card className="mt-4 p-4 shadow-lg rounded-lg">
            <h2 className="text-xl font-bold">Total Ticket Sales: {totalSold}</h2>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Line Chart */}
            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-4">Ticket Sales by Time Slot</h2>
              <div className="h-64">
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top" as const,
                        labels: {
                          color: isDarkMode ? "white" : "black",
                        },
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: isDarkMode ? "white" : "black",
                        },
                        grid: {
                          color: isDarkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                        },
                      },
                      x: {
                        ticks: {
                          color: isDarkMode ? "white" : "black",
                        },
                        grid: {
                          color: isDarkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card>

            {/* Donut Chart */}
            <Card className="p-4 shadow-lg rounded-lg">
              <h2 className="text-xl font-bold mb-4">Sales by Location</h2>
              <div className="h-64">
                <Doughnut
                  data={donutChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top" as const,
                        labels: {
                          color: isDarkMode ? "white" : "black",
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card>
          </div>

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
                {sortedAnalyticsData.map((item) => (
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
        </>
      )}
    </PageContainer>
  );
}
