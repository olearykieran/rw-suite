// src/app/api/ticket-sales-report/route.ts
import { NextResponse } from "next/server";
import {
  fetchTicketSalesReport,
  calculateProjectedYearlyRevenue,
} from "@/lib/services/TicketSalesReportService";

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

    // Fetch ticket sales report data from our service
    const salesData = await fetchTicketSalesReport(
      startDate,
      endDate,
      location && location !== "All" ? location : undefined
    );

    // Calculate total sales for the period
    const totalSales = salesData.reduce((acc, row) => acc + Number(row.sold_tickets), 0);

    // Calculate total revenue for the period
    const totalRevenue = salesData.reduce((acc, row) => acc + Number(row.revenue), 0);

    // Calculate projected yearly revenue
    const projectedYearlyRevenue = calculateProjectedYearlyRevenue(salesData);

    // Return the report data and calculated totals
    return NextResponse.json({
      data: salesData,
      totalSales,
      totalRevenue,
      projectedYearlyRevenue,
    });
  } catch (error: any) {
    console.error("Error in /api/ticket-sales-report:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
