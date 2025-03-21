import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getTicketSalesReport } from "@/lib/services/TicketSalesReportService";

/**
 * Public API endpoint to fetch ticket sales report data without authentication
 * This allows sharing ticket sales reports via direct links
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const projectId = url.searchParams.get("projectId");
  const subProjectId = url.searchParams.get("subProjectId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const location = url.searchParams.get("location");

  console.log("Public Ticket Sales Report API called", {
    orgId,
    projectId,
    subProjectId,
    startDate,
    endDate,
    location,
  });

  if (!orgId || !projectId || !subProjectId) {
    console.error("Missing required parameters", { orgId, projectId, subProjectId });
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  if (!startDate || !endDate) {
    console.error("Missing date range parameters", { startDate, endDate });
    return NextResponse.json({ error: "Missing date range parameters" }, { status: 400 });
  }

  try {
    // Use the combined data sources service
    const result = await getTicketSalesReport(
      startDate!,
      endDate!,
      location && location !== "All" ? location : null
    );

    console.log("Returning ticket sales data", {
      count: result.data.length,
      totalSales: result.totalSales,
      totalRevenue: result.totalRevenue,
      projectedYearlyRevenue: result.projectedYearlyRevenue,
      hasTimeslotData: result.data.some(
        (item: DailySalesData) => item.timeslots && item.timeslots.length > 0
      ),
    });

    return NextResponse.json({
      data: result.data,
      totalSales: result.totalSales,
      totalRevenue: result.totalRevenue,
      projectedYearlyRevenue: result.projectedYearlyRevenue,
    });
  } catch (error: any) {
    console.error("Error in public ticket sales report API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to calculate the number of days between two dates
 */
function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end dates
}

// Updated data interface to include timeslots
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
  timeslots?: TimeslotData[];
}
