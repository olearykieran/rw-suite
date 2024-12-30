// src/app/dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/importexport/api/route.ts

import { NextRequest, NextResponse } from "next/server";
import { exportTasksToJson, importTasksFromJson } from "@/lib/services/TaskService";

/**
 * This route handles GET/POST for tasks import/export.
 * Path:
 *  /dashboard/organizations/[orgId]/projects/[projectId]/subprojects/[subProjectId]/tasks/importexport/api
 *
 * Query param: ?mode=export or ?mode=import
 */

// GET => export tasks
export async function GET(req: NextRequest, context: any) {
  try {
    const { orgId, projectId, subProjectId } = context.params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // e.g. "export"

    if (mode === "export") {
      const data = await exportTasksToJson(orgId, projectId, subProjectId);
      return NextResponse.json(data);
    }

    return NextResponse.json({ message: "No mode specified" }, { status: 400 });
  } catch (err: any) {
    console.error("GET tasks importexport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST => import tasks
export async function POST(req: NextRequest, context: any) {
  try {
    const { orgId, projectId, subProjectId } = context.params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "import"

    const body = await req.json(); // array of tasks

    if (mode === "import") {
      await importTasksFromJson(orgId, projectId, subProjectId, body);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "No mode specified" }, { status: 400 });
  } catch (err: any) {
    console.error("POST tasks importexport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
