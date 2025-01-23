"use client"; // remove if not needed for Next.js client

import { firestore, auth } from "@/lib/firebaseConfig";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { WorkBook } from "xlsx";

// -------------- TypeScript interfaces --------------
/**
 * SubTask
 * A lightweight interface to represent subtasks.
 * If you need more fields, add them here.
 */
export interface SubTask {
  id: string;
  title: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  durationDays?: number;
}

/**
 * TaskDoc
 * The main "Task" object we store in Firestore
 */
export interface TaskDoc {
  id: string;

  // Basic
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: string;
  status?: string;

  // Outline-based
  tempId?: string; // e.g. "5","5.8","5.8.1"
  outlineNumber?: string; // same as above
  isSubtask?: boolean;
  parentTempId?: string; // the parent's tempId
  parentId?: string;
  subTaskTempIds?: string[]; // child's tempIds
  subtaskIds?: string[]; // doc IDs after fix

  // Scheduling
  startDate?: Date | null;
  endDate?: Date | null;
  durationDays?: number;

  // Dependencies
  predecessors?: string[];
  successors?: string[];

  // Sort
  orderIndex?: number;

  // Firestore metadata
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;

  blockedWeekdays?: number[];
  blockedDates?: string[];
}

// -------------- Parsing --------------
/**
 * parseMsProjectExcelFile
 * Reads an Excel file exported from MS Project, returning a list of TaskDocs.
 *
 * A typical cause of "multiple entries per line" is that the Excel file may have
 * merged rows or partial rows.  Here, we add extra checks (e.g. ensuring col0 is numeric)
 * to skip extraneous lines.
 */
export async function parseMsProjectExcelFile(file: File): Promise<TaskDoc[]> {
  console.log("parseMsProjectExcelFile => reading file:", file.name);

  // 1) import xlsx
  const XLSXImport = await import("xlsx");
  const XLSX = XLSXImport.default || XLSXImport;
  if (!XLSX?.read) {
    throw new Error("SheetJS XLSX missing read()");
  }

  // 2) read => first sheet
  const arrayBuf = await file.arrayBuffer();
  const wb: WorkBook = XLSX.read(arrayBuf, { type: "array", cellDates: true });
  if (!wb.SheetNames?.length) throw new Error("No sheets in workbook.");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("No sheet object found in workbook.");

  // 3) convert => array-of-arrays
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "mm/dd/yyyy",
  });

  // Suppose row 9 => tasks start (you can adjust if needed)
  const tasksStartIndex = 9;
  const lastRow = data.length;

  interface TempRow {
    taskNumber: string; // col0 => "1","2","3"
    outline: string; // col1 => "1","1.1","5.8","5.8.1", ...
    title: string;
    assignedTo?: string;
    start?: any;
    finish?: any;
    durStr?: string;
    pctComplete?: string;
    priority?: string;
    preds?: string[];
    succs?: string[];

    // subtask info
    isSubtask?: boolean;
    parentTempId?: string; // parent's "taskNumber"
    subTaskTempIds: string[];

    // derived scheduling
    startDate?: Date | null;
    endDate?: Date | null;
    durationDays?: number;
    status?: string;
  }

  const rows: TempRow[] = [];

  for (let r = tasksStartIndex; r < lastRow; r++) {
    const row = data[r];
    if (!row || row.length === 0) {
      // empty row => skip
      continue;
    }

    // Columns:
    //   0 => taskNumber
    //   1 => outline
    //   2 => title
    //   3 => assigned
    //   4 => start
    //   5 => finish
    //   6 => durStr
    //   8 => percentComplete
    //   9 => priority
    //   10 => dependsRaw
    //   11 => dependsAfterRaw
    // (If you have more or fewer columns, adjust the indexes)
    const col0 = row[0]?.toString().trim(); // e.g. "1","2"
    const col1 = row[1]?.toString().trim(); // e.g. "1.1","5.8","5.8.1"

    // Additional check: ensure col0 is a valid numeric (this helps skip junk lines)
    const col0Num = parseFloat(col0);
    if (!col0 || !col1 || isNaN(col0Num)) {
      // skip if missing or not numeric
      continue;
    }

    const title = row[2]?.toString().trim() || "Untitled";
    const assigned = row[3]?.toString().trim() || "";
    const startVal = row[4];
    const endVal = row[5];
    const durStr = row[6]?.toString().trim() || "";
    const pct = row[8]?.toString().trim() || "";
    const prio = row[9]?.toString().trim() || "";
    const dependsRaw = row[10]?.toString().trim() || "";
    const dependsAfterRaw = row[11]?.toString().trim() || "";

    rows.push({
      taskNumber: col0,
      outline: col1,
      title,
      assignedTo: assigned,
      start: startVal,
      finish: endVal,
      durStr,
      pctComplete: pct,
      priority: prio || undefined,
      preds: parseDependencies(dependsRaw),
      succs: parseDependencies(dependsAfterRaw),

      isSubtask: false,
      parentTempId: undefined,
      subTaskTempIds: [],
    });
  }

  // parse date + status
  for (const row of rows) {
    row.startDate = parseDate(row.start);
    row.endDate = parseDate(row.finish);

    let dd = 0;
    if (row.durStr) {
      const dnum = parseFloat(row.durStr);
      if (!isNaN(dnum)) dd = dnum;
    }
    row.durationDays = dd;

    let st = "notStarted";
    if (row.pctComplete === "100%") st = "completed";
    else if (row.pctComplete !== "0%" && row.pctComplete !== "") st = "inProgress";
    row.status = st;
  }

  // ============ Multi-Level Approach ============
  // For each row => see how many dots => that's dotCount
  // Then gather children that start with row.outline + "." and have (dotCount+1) total dots
  for (const parentRow of rows) {
    const pDotCount = countDots(parentRow.outline);
    const prefix = parentRow.outline + ".";
    for (const childRow of rows) {
      if (childRow === parentRow) continue;
      if (childRow.outline.startsWith(prefix)) {
        // must have exactly (pDotCount+1) dots
        const cDots = countDots(childRow.outline);
        if (cDots === pDotCount + 1) {
          parentRow.subTaskTempIds.push(childRow.taskNumber);
          childRow.parentTempId = parentRow.taskNumber;
          childRow.isSubtask = true;
        }
      }
    }
  }

  // ============ Build Final =============
  const final: TaskDoc[] = [];
  let index = 0;
  for (const row of rows) {
    final.push({
      id: "",
      tempId: row.taskNumber,
      outlineNumber: row.outline,
      isSubtask: row.isSubtask,
      parentTempId: row.parentTempId,
      subTaskTempIds: row.subTaskTempIds.length ? row.subTaskTempIds : undefined,

      title: row.title,
      assignedTo: row.assignedTo,
      status: row.status,
      priority: row.priority,
      startDate: row.startDate,
      endDate: row.endDate,
      durationDays: row.durationDays,
      predecessors: row.preds && row.preds.length ? row.preds : undefined,
      successors: row.succs && row.succs.length ? row.succs : undefined,

      orderIndex: index++,
    });
  }

  console.log(
    "parseMsProjectExcelFile => returning",
    final.length,
    "items. Multi-level subtask support."
  );
  return final;
}

// -------------- parse helper funcs --------------
function parseDependencies(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const dt = new Date(val);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

function countDots(s: string): number {
  return (s.match(/\./g) || []).length;
}

// ================ Firestore conversion helpers ================
function convertAllDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(convertAllDates);
  if (obj instanceof Date) return obj;
  if (obj.seconds) {
    return new Date(obj.seconds * 1000);
  }
  const out: any = {};
  for (const k of Object.keys(obj)) {
    out[k] = convertAllDates(obj[k]);
  }
  return out;
}

function stripDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(stripDates);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    out[k] = stripDates(obj[k]);
  }
  return out;
}

/**
 * computeEndDateIgnoringBlocked
 * - Adds "durationDays" working days to "start", skipping blockedWeekdays and blockedDates.
 *   The final date is returned.
 */
function computeEndDateIgnoringBlocked(
  start: Date,
  durationDays: number,
  blockedWeekdays: number[] = [0, 6],
  blockedDates: string[] = []
): Date {
  if (durationDays <= 0) return new Date(start);
  let remaining = durationDays;
  const cur = new Date(start);
  // We already start on day1, so subtract 1
  remaining -= 1;
  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (blockedWeekdays.includes(dow)) continue;
    if (blockedDates.includes(iso)) continue;
    remaining--;
  }
  return cur;
}

// ================ Firestore CRUD ================
export async function fetchAllTasks(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<TaskDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks"
  );
  const snap = await getDocs(collRef);
  return snap.docs.map((d) => {
    const raw = { id: d.id, ...d.data() };
    return convertAllDates(raw) as TaskDoc;
  });
}

export async function fetchTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string
): Promise<TaskDoc> {
  const ref = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks",
    taskId
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Task not found => " + taskId);
  const raw = { id: snap.id, ...snap.data() };
  return convertAllDates(raw) as TaskDoc;
}

export async function createTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<TaskDoc, "id">
): Promise<string> {
  console.log("createTask => incoming data:", data);

  const cleaned = { ...data } as any;
  if (cleaned.subtasks) {
    console.warn("createTask => removing unexpected .subtasks:", cleaned.subtasks);
    delete cleaned.subtasks;
  }
  // optional end date
  if (cleaned.startDate instanceof Date && typeof cleaned.durationDays === "number") {
    cleaned.endDate = computeEndDateIgnoringBlocked(
      cleaned.startDate,
      cleaned.durationDays,
      cleaned.blockedWeekdays || [],
      cleaned.blockedDates || []
    );
  }

  const stripped = stripDates(cleaned);
  console.log("createTask => final doc =>", stripped);

  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks"
  );
  const docRef = await addDoc(collRef, {
    ...stripped,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  console.log("createTask => docId=", docRef.id);
  return docRef.id;
}

export async function updateTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string,
  updates: Partial<TaskDoc>
) {
  console.log("updateTask => incoming updates:", updates);

  const cleaned = { ...updates } as any;
  if (cleaned.subtasks) {
    console.warn("updateTask => removing unexpected .subtasks:", cleaned.subtasks);
    delete cleaned.subtasks;
  }

  // fetch existing so we can re-derive any fields (like endDate)
  const existing = await fetchTask(orgId, projectId, subProjectId, taskId);
  const merged = { ...existing, ...cleaned };

  if (merged.startDate instanceof Date && typeof merged.durationDays === "number") {
    merged.endDate = computeEndDateIgnoringBlocked(
      merged.startDate,
      merged.durationDays,
      merged.blockedWeekdays || [],
      merged.blockedDates || []
    );
  }

  const stripped = stripDates(merged);
  console.log("updateTask => final doc =>", stripped);

  const ref = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks",
    taskId
  );
  await updateDoc(ref, {
    ...stripped,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  console.log("updateTask => docId=", taskId, " updated.");
}

export async function deleteTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string
) {
  const ref = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks",
    taskId
  );
  await deleteDoc(ref);
  console.log("deleteTask => docId=", taskId, " deleted.");
}

export async function importTasksFromJson(
  orgId: string,
  projectId: string,
  subProjectId: string,
  tasksData: Omit<TaskDoc, "id">[]
) {
  console.log("importTasksFromJson => data length:", tasksData.length);

  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks"
  );
  for (let i = 0; i < tasksData.length; i++) {
    const row = { ...tasksData[i] };
    console.log("importTasksFromJson => row #" + i, row);

    if ((row as any).subtasks) {
      console.warn("importTasksFromJson => removing .subtasks:", (row as any).subtasks);
      delete (row as any).subtasks;
    }
    if (row.startDate instanceof Date && typeof row.durationDays === "number") {
      row.endDate = computeEndDateIgnoringBlocked(
        row.startDate,
        row.durationDays,
        row.blockedWeekdays || [],
        row.blockedDates || []
      );
    }
    const stripped = stripDates(row);
    await addDoc(collRef, {
      ...stripped,
      orderIndex: i,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });
  }
  console.log("importTasksFromJson => import complete.");
}

export async function exportTasksToJson(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<Omit<TaskDoc, "id">[]> {
  const tasks = await fetchAllTasks(orgId, projectId, subProjectId);
  return tasks.map(({ id, ...rest }) => rest);
}
