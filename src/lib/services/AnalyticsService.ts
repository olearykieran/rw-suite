// src/lib/services/AnalyticsService.ts
// This service file provides an abstraction over the database operations
// for retrieving analytics data from our ticket_sales_view.

import pool from "@/lib/db";

// Define the interface for our analytics data.
export interface AnalyticsData {
  timeslot_id: number;
  location: string;
  date: string;
  timeslot: string;
  total_tickets: number;
  remaining_tickets: number;
  sold_tickets: number;
  last_updated: Date;
}

/**
 * Fetches analytics data (ticket sales) for a given specific date and optional location
 * from the ticket_sales_view.
 *
 * @param date - The specific date (e.g., "2025-02-17")
 * @param location - (Optional) The location filter (e.g., "Flatiron" or "Williamsburg")
 * @returns An array of AnalyticsData objects.
 */
export async function fetchAnalytics(
  date: string,
  location?: string
): Promise<AnalyticsData[]> {
  let query = `
    SELECT
      timeslot_id,
      location,
      "date",
      timeslot,
      total_tickets,
      remaining_tickets,
      sold_tickets,
      "scrapedAt" as last_updated
    FROM ticket_sales_view
    WHERE "date" = $1::date
  `;
  const values: any[] = [date];

  if (location) {
    query += ` AND location = $2`;
    values.push(location);
  }

  query += ` ORDER BY location, timeslot;`;

  try {
    const res = await pool.query(query, values);
    return res.rows;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw error;
  }
}
