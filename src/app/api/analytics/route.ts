// src/app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { fetchAnalytics } from "@/lib/services/AnalyticsService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const location = searchParams.get("location"); // optional parameter

    if (!date) {
      return NextResponse.json({ error: 'Missing "date" parameter' }, { status: 400 });
    }

    // Fetch analytics data from our service.
    const analyticsData = await fetchAnalytics(
      date,
      location && location !== "All" ? location : undefined
    );

    // Calculate total sold tickets.
    const totalSold = analyticsData.reduce(
      (acc, row) => acc + Number(row.sold_tickets),
      0
    );

    // Return both detailed rows and the aggregated total.
    return NextResponse.json({ data: analyticsData, totalSold });
  } catch (error: any) {
    console.error("Error in /api/analytics:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
