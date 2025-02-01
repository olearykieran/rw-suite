import { NextRequest, NextResponse } from "next/server";
import { firestore, auth } from "@/lib/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { orgId, projectId, subProjectId, bidId, parsedLines } = await req.json();
    if (!orgId || !projectId || !subProjectId || !bidId || !parsedLines) {
      return NextResponse.json(
        { error: "Missing fields in request body" },
        { status: 400 }
      );
    }

    const docRef = doc(
      firestore,
      "organizations",
      orgId,
      "projects",
      projectId,
      "subprojects",
      subProjectId,
      "bids",
      bidId
    );

    await updateDoc(docRef, {
      parsedLines,
      updatedBy: auth.currentUser?.uid || null,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("update-bid-matches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
