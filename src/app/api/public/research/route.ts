// src/app/api/public/research/route.ts
import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/**
 * Public API endpoint to fetch research entries without authentication
 * This allows sharing research entries via direct links
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const projectId = url.searchParams.get("projectId");
  const subProjectId = url.searchParams.get("subProjectId");

  console.log("Public API called", { orgId, projectId, subProjectId });

  if (!orgId || !projectId || !subProjectId) {
    console.error("Missing required parameters", { orgId, projectId, subProjectId });
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Try both collection names to ensure we find the data
    let collRef = collection(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "subprojects",
      subProjectId,
      "researchEntries" // Try this collection name first
    );

    let snapshot = await getDocs(collRef);
    console.log("First collection query result", { empty: snapshot.empty, count: snapshot.docs.length });

    // If no documents found, try the other collection name
    if (snapshot.empty) {
      collRef = collection(
        firestore,
        "organizations",
        orgId,
        "projects",
        projectId,
        "subprojects",
        subProjectId,
        "research" // Try this collection name as fallback
      );
      snapshot = await getDocs(collRef);
      console.log("Second collection query result", { empty: snapshot.empty, count: snapshot.docs.length });
    }

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Returning research entries", { count: entries.length });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error fetching research entries:", error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch research entries" },
      { status: 500 }
    );
  }
}
