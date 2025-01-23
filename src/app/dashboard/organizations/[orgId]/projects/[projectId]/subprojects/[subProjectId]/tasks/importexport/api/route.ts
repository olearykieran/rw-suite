import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import serviceAccountKey from "../../../../../../../../../../../../service-account-key.json";

// Avoid multiple Firebase admin initializations
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccountKey as any),
  });
}

const db = getFirestore();

/**
 * GET => export tasks => reads from Firestore => returns JSON
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; projectId: string; subProjectId: string }> }
): Promise<NextResponse> {
  try {
    const { orgId, projectId, subProjectId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "export") {
      // Firestore read
      const tasksColl = db
        .collection("organizations")
        .doc(orgId)
        .collection("projects")
        .doc(projectId)
        .collection("subprojects")
        .doc(subProjectId)
        .collection("tasks");

      const snap = await tasksColl.orderBy("orderIndex", "asc").get();
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      return NextResponse.json(data);
    }

    // no mode => return error
    return NextResponse.json({ message: "No mode specified" }, { status: 400 });
  } catch (err: any) {
    console.error("GET tasks importexport error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error in GET" },
      { status: 500 }
    );
  }
}

/**
 * POST => import tasks => "two-phase" approach
 *   1) We store each row exactly as the parser gave it (.tempId, .subTaskTempIds, etc.)
 *   2) Then fix references => doc IDs in phase B
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; projectId: string; subProjectId: string }> }
): Promise<NextResponse> {
  try {
    const { orgId, projectId, subProjectId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "import") {
      const bodyData = await request.json();
      await importTasksTwoPhase(orgId, projectId, subProjectId, bodyData);
      return NextResponse.json({ success: true });
    }

    // no mode => error
    return NextResponse.json({ message: "No mode specified" }, { status: 400 });
  } catch (err: any) {
    console.error("POST tasks importexport error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error in POST" },
      { status: 500 }
    );
  }
}

/**
 * importTasksTwoPhase =>
 *   1) Phase A => store each row as-is (tempId, subTaskTempIds, etc.)
 *   2) Phase B => fix references => doc IDs (parentId, subtaskIds, etc.)
 *
 * This code does NOT recalc subTaskTempIds.  If your parser sets row => subTaskTempIds=["28","29","30"],
 * that’s how it will be stored. We only fix them to doc IDs in phase B.
 */
async function importTasksTwoPhase(
  orgId: string,
  projectId: string,
  subProjectId: string,
  tasksData: any[]
) {
  const tasksColl = db
    .collection("organizations")
    .doc(orgId)
    .collection("projects")
    .doc(projectId)
    .collection("subprojects")
    .doc(subProjectId)
    .collection("tasks");

  console.log("PHASE A: Creating docs for every row...");
  const tempToReal: Record<string, string> = {};

  // ------ PHASE A => create each row as a doc
  for (let i = 0; i < tasksData.length; i++) {
    const row = { ...tasksData[i] };
    delete row.id; // remove leftover Firestore doc ID
    row.orderIndex = i;

    console.log(
      `Row #${i} => tempId=${row.tempId}, parentTempId=${row.parentTempId}, subTaskTempIds=${row.subTaskTempIds}`
    );

    // create doc
    const docRef = await tasksColl.add({
      ...row,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  Created doc => docId=${docRef.id}, tempId=${row.tempId}`);

    if (row.tempId) {
      tempToReal[row.tempId] = docRef.id;
    }
  }

  // ------ PHASE B => fix references => doc IDs
  console.log("PHASE B: Fix references => doc IDs...");
  const snap = await tasksColl.get();
  for (const docSnap of snap.docs) {
    const docId = docSnap.id;
    const docData = docSnap.data();
    const { parentTempId, subTaskTempIds, predecessors, successors } = docData;

    let changed = false;
    const updateObj: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // fix parent
    if (parentTempId && tempToReal[parentTempId]) {
      updateObj.parentId = tempToReal[parentTempId];
      changed = true;
    }

    // fix subTaskTempIds => subtaskIds
    if (Array.isArray(subTaskTempIds) && subTaskTempIds.length) {
      const newSubs: string[] = [];
      for (const childTemp of subTaskTempIds) {
        if (tempToReal[childTemp]) {
          newSubs.push(tempToReal[childTemp]);
          changed = true;
        } else {
          console.warn(
            `  docId=${docId} references unknown subTaskTempId="${childTemp}".`
          );
        }
      }
      updateObj.subtaskIds = newSubs;
    }

    // fix .predecessors => doc IDs
    if (Array.isArray(predecessors)) {
      const newPreds: string[] = [];
      for (const p of predecessors) {
        // e.g. "5.8FS" => parse out "5.8"
        const match = p.match(/^([\d\.]+)/);
        if (match) {
          const numericPart = match[1];
          if (tempToReal[numericPart]) {
            newPreds.push(tempToReal[numericPart]);
            changed = true;
          } else {
            newPreds.push(p);
          }
        } else {
          newPreds.push(p);
        }
      }
      updateObj.predecessors = newPreds;
    }

    // fix .successors => doc IDs
    if (Array.isArray(successors)) {
      const newSucc: string[] = [];
      for (const s of successors) {
        const match = s.match(/^([\d\.]+)/);
        if (match) {
          const numericPart = match[1];
          if (tempToReal[numericPart]) {
            newSucc.push(tempToReal[numericPart]);
            changed = true;
          } else {
            newSucc.push(s);
          }
        } else {
          newSucc.push(s);
        }
      }
      updateObj.successors = newSucc;
    }

    if (changed) {
      console.log(`  Updating docId=${docId} to fix references...`);
      await docSnap.ref.update(updateObj);
    }
  }

  console.log("PHASE B done. All references re-linked!");
}
