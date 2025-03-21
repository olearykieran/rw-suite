// src/lib/services/TicketSalesReportService.ts
import mainPool, { othershipPool } from "@/lib/db";

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
    const res = await mainPool.query(query, values);
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

/**
 * Get ticket sales report data from both databases
 */
export async function getTicketSalesReport(
  startDate: string,
  endDate: string,
  location: string | null = null
) {
  try {
    // Get data from main database (Flatiron/Williamsburg)
    let mainDbResults: any[] = [];
    if (
      !location ||
      location === "All" ||
      location === "Flatiron" ||
      location === "Williamsburg"
    ) {
      // Begin transaction for main database
      const mainClient = await mainPool.connect();

      try {
        // Original ticket sales query for existing locations
        let locationFilter = "";
        if (location && location !== "All") {
          locationFilter = `AND location = $3`;
        }

        // Get existing ticket sales data
        const existingTicketsSql = `
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
          ${locationFilter}
          GROUP BY "date", location
          ORDER BY "date", location
        `;

        const mainResult = await mainClient.query(
          existingTicketsSql,
          location && location !== "All"
            ? [startDate, endDate, location]
            : [startDate, endDate]
        );

        mainDbResults = mainResult.rows;
      } finally {
        mainClient.release();
      }
    }

    // Get data from Othership database
    let othershipDbResults: any[] = [];
    if (!location || location === "All" || location === "Othership") {
      // Begin transaction for Othership database
      const othershipClient = await othershipPool.connect();

      try {
        // Query for Othership data from the classes table with timeslot detail
        const othershipSql = `
          SELECT
            class_date::date as "date",
            'Othership' as location,
            class_time as timeslot,
            capacity as total_tickets,
            CASE
              WHEN status = 'class cancelled' THEN 0
              WHEN status = 'class full' THEN capacity
              WHEN status = 'waitlist' THEN 0
              ELSE spots_filled
            END as sold_tickets,
            CASE
              WHEN status = 'class cancelled' THEN 0
              WHEN status = 'class full' THEN capacity * 64
              WHEN status = 'waitlist' THEN 0
              ELSE spots_filled * 64
            END as revenue
          FROM classes
          WHERE class_date::date BETWEEN $1::date AND $2::date
          ORDER BY class_date::date, class_time
        `;

        const othershipResult = await othershipClient.query(othershipSql, [
          startDate,
          endDate,
        ]);

        // Transform the detailed data into the expected format
        // Group by date and aggregate metrics
        const othershipDataByDate = othershipResult.rows.reduce((acc: any, row: any) => {
          const date = row.date;
          if (!acc[date]) {
            acc[date] = {
              date,
              location: "Othership",
              total_tickets: 0,
              sold_tickets: 0,
              revenue: 0,
              timeslots: [],
            };
          }

          // Add to daily totals
          acc[date].total_tickets += parseInt(row.total_tickets);
          acc[date].sold_tickets += parseInt(row.sold_tickets);
          acc[date].revenue += parseFloat(row.revenue);

          // Add timeslot details
          acc[date].timeslots.push({
            timeslot: row.timeslot,
            total_tickets: parseInt(row.total_tickets),
            sold_tickets: parseInt(row.sold_tickets),
            revenue: parseFloat(row.revenue),
          });

          return acc;
        }, {});

        // Convert the grouped data back to array format for the response
        othershipDbResults = Object.values(othershipDataByDate);
      } finally {
        othershipClient.release();
      }
    }

    // Combine results from both databases
    const combinedResults = [...mainDbResults, ...othershipDbResults];

    // Calculate totals
    const totalSales = combinedResults.reduce(
      (sum, row) => sum + parseInt(row.sold_tickets),
      0
    );
    const totalRevenue = combinedResults.reduce(
      (sum, row) => sum + parseFloat(row.revenue),
      0
    );

    // Calculate projected yearly revenue based on daily average
    const daysBetween = calculateDaysBetween(new Date(startDate), new Date(endDate));
    const dailyAverage = totalRevenue / daysBetween;
    const projectedYearlyRevenue = dailyAverage * 365;

    return {
      data: combinedResults,
      totalSales,
      totalRevenue,
      projectedYearlyRevenue,
    };
  } catch (error) {
    console.error("Error getting ticket sales report:", error);
    throw error;
  }
}

/**
 * Helper function to calculate days between two dates
 */
function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds
  const diffDays = Math.round(
    Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)
  );
  return diffDays + 1; // Include both start and end date in the count
}
