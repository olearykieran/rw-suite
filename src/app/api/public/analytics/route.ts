import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

/**
 * Public API endpoint to fetch analytics data without authentication
 * This allows sharing analytics via direct links
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const projectId = url.searchParams.get("projectId");
  const subProjectId = url.searchParams.get("subProjectId");
  const date = url.searchParams.get("date");
  const location = url.searchParams.get("location");

  console.log("Public Analytics API called", {
    orgId,
    projectId,
    subProjectId,
    date,
    location,
  });

  if (!orgId || !projectId || !subProjectId) {
    console.error("Missing required parameters", { orgId, projectId, subProjectId });
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    // Define the path to analytics data
    const collRef = collection(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "subprojects",
      subProjectId,
      "analytics"
    );

    // Build query based on provided filters
    let queryRef = query(collRef);

    // Add date filter if provided
    if (date) {
      queryRef = query(queryRef, where("date", "==", date));
    }

    // Add location filter if provided and not "All"
    if (location && location !== "All") {
      queryRef = query(queryRef, where("location", "==", location));
    }

    const snapshot = await getDocs(queryRef);
    console.log("Analytics query result", {
      empty: snapshot.empty,
      count: snapshot.docs.length,
    });

    const data = snapshot.docs.map((doc) => ({
      timeslot_id: doc.id,
      ...doc.data(),
    }));

    // Calculate total sold tickets
    const totalSold = data.reduce((sum, item: any) => sum + (item.sold_tickets || 0), 0);

    console.log("Returning analytics data", { count: data.length, totalSold });

    return NextResponse.json({ data, totalSold });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
