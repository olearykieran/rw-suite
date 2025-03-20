import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

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
    // Define the path to ticket sales data
    const collRef = collection(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "subprojects",
      subProjectId,
      "ticketSales"
    );

    // Build query based on provided filters
    let queryRef = query(collRef);

    // Add date range filter
    queryRef = query(
      queryRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );

    // Add location filter if provided and not "All"
    if (location && location !== "All") {
      queryRef = query(queryRef, where("location", "==", location));
    }

    const snapshot = await getDocs(queryRef);
    console.log("Ticket sales query result", {
      empty: snapshot.empty,
      count: snapshot.docs.length,
    });

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate totals
    const totalSales = data.reduce((sum, item: any) => sum + (item.sold_tickets || 0), 0);
    const totalRevenue = data.reduce((sum, item: any) => sum + (item.revenue || 0), 0);

    // Calculate projected yearly revenue
    // This is a simple projection based on the daily average during the selected period
    const dayCount = Math.max(1, calculateDaysBetween(startDate, endDate));
    const dailyAverage = totalRevenue / dayCount;
    const projectedYearlyRevenue = dailyAverage * 365;

    console.log("Returning ticket sales data", {
      count: data.length,
      totalSales,
      totalRevenue,
      projectedYearlyRevenue,
    });

    return NextResponse.json({
      data,
      totalSales,
      totalRevenue,
      projectedYearlyRevenue,
    });
  } catch (error) {
    console.error("Error fetching ticket sales data:", error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch ticket sales data" },
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
