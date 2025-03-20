// src/lib/services/TicketSalesReportService.ts
import pool from "@/lib/db";

// Define the interface for our ticket sales report data
export interface DailySalesData {
  date: string;
  location: string;
  total_tickets: number;
  sold_tickets: number;
  revenue: number;
}

/**
 * Fetches ticket sales data for a date range
 *
 * @param startDate - Start date of the report period (YYYY-MM-DD)
 * @param endDate - End date of the report period (YYYY-MM-DD)
 * @param location - Optional location filter
 * @returns Array of daily sales data
 */
export async function fetchTicketSalesReport(
  startDate: string,
  endDate: string,
  location?: string
): Promise<DailySalesData[]> {
  let query = `
    SELECT
      "date",
      location,
      SUM(total_tickets) as total_tickets,
      SUM(sold_tickets) as sold_tickets,
      SUM(
        CASE
          WHEN EXTRACT(DOW FROM "date"::date) IN (0, 6) THEN sold_tickets * 75
          WHEN timeslot ~ '([5-9]|1[0-2]) PM' THEN sold_tickets * 70
          ELSE sold_tickets * 60
        END
      ) as revenue
    FROM ticket_sales_view
    WHERE "date" BETWEEN $1::date AND $2::date
  `;

  const values: any[] = [startDate, endDate];

  if (location) {
    query += ` AND location = $3`;
    values.push(location);
  }

  query += ` GROUP BY "date", location ORDER BY "date", location;`;

  try {
    const res = await pool.query(query, values);
    return res.rows;
  } catch (error) {
    console.error("Error fetching ticket sales report:", error);
    throw error;
  }
}

/**
 * Calculates projected yearly revenue based on the provided sales data
 *
 * @param salesData - Array of daily sales data
 * @returns Projected yearly revenue
 */
export function calculateProjectedYearlyRevenue(salesData: DailySalesData[]): number {
  if (salesData.length === 0) return 0;

  // Calculate total revenue for the period
  const totalRevenue = salesData.reduce((sum, day) => sum + Number(day.revenue), 0);

  // Calculate number of days in the period
  const startDate = new Date(salesData[0].date);
  const endDate = new Date(salesData[salesData.length - 1].date);
  const daysDifference =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate daily average revenue
  const dailyAverage = totalRevenue / daysDifference;

  // Project to yearly revenue (365 days)
  return dailyAverage * 365;
}
