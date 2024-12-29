import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebaseConfig";

export async function POST(req: NextRequest, { params }: any) {
  try {
    const body = await req.json();
    const orgId = params.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Example: expecting body.projects as an array
    const { projects } = body;
    if (!Array.isArray(projects)) {
      return NextResponse.json({ error: "Invalid projects array" }, { status: 400 });
    }

    const ref = collection(firestore, "organizations", orgId, "projects");
    const results = [];
    for (const proj of projects) {
      const docRef = await addDoc(ref, {
        ...proj,
        createdAt: new Date(),
      });
      results.push(docRef.id);
    }

    return NextResponse.json({ status: "ok", createdIds: results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
