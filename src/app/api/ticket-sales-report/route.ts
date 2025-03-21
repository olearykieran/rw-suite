// src/app/api/ticket-sales-report/route.ts
import { NextResponse } from "next/server";
import { getTicketSalesReport } from "@/lib/services/TicketSalesReportService";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const location = searchParams.get("location"); // optional parameter

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing "startDate" or "endDate" parameter' },
        { status: 400 }
      );
    }

    // Fetch ticket sales report data from our service with combined data sources
    const result = await getTicketSalesReport(
      startDate,
      endDate,
      location && location !== "All" ? location : null
    );

    // Log data structure for debugging
    console.log(
      "API response contains timeslot data:",
      result.data.some(
        (item: DailySalesData) => item.timeslots && item.timeslots.length > 0
      )
    );

    // Return the report data and calculated totals
    return NextResponse.json({
      data: result.data,
      totalSales: result.totalSales,
      totalRevenue: result.totalRevenue,
      projectedYearlyRevenue: result.projectedYearlyRevenue,
    });
  } catch (error: any) {
    console.error("Error in /api/ticket-sales-report:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
