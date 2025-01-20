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

function ensureDate(val: any): Date | null {
  /**
   * Safely convert Firestore Timestamps or iso-strings to a real Date,
   * or return null if invalid.
   */
  if (!val) return null;
  if (val instanceof Date) return val;
  // Firestore Timestamp => { seconds, nanoseconds } or .toDate()
  if (val.seconds) {
    return new Date(val.seconds * 1000);
  }
  // ISO string => e.g. "2024-01-03T00:00:00.000Z"
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val);
  }
  return null;
}

/**
 * Recursively convert any date-like fields in an object
 * to real Date objects.
 */
function convertAllDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertAllDates);
  }
  if (obj instanceof Date) {
    return obj;
  }
  // Potential Firestore Timestamp
  if (obj.seconds && typeof obj.toDate !== "function") {
    // just in case
    return new Date(obj.seconds * 1000);
  }
  // If we suspect a date string
  if (typeof obj === "string" && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj);
  }

  const out: any = {};
  for (const k of Object.keys(obj)) {
    out[k] = convertAllDates(obj[k]);
  }
  return out;
}

/**
 * Convert all `Date` objects into ISO strings before saving to Firestore.
 */
function stripDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(stripDates);
  }
  const out: any = {};
  for (const k of Object.keys(obj)) {
    out[k] = stripDates(obj[k]);
  }
  return out;
}

export interface TaskConstraints {
  mustStartOn?: Date | null;
  deadline?: Date | null;
}

export interface TaskResources {
  crew?: string; // e.g. "Carpentry crew, Electrician"
  materials?: string; // e.g. "Concrete, Steel beams"
}

export interface SubTask {
  id: string;
  title: string;
  assignedTo?: string;
  status?: string; // "notStarted" | "inProgress" | "delayed" | "completed"
  description?: string;

  // Scheduling
  startDate?: Date | null;
  endDate?: Date | null;
  durationDays?: number;

  // Dependencies
  predecessors?: string[];
  successors?: string[];
}

export interface TaskDoc {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string; // userId or email
  priority?: string; // "low" | "medium" | "high" or custom
  status?: string; // "notStarted" | "inProgress" | "delayed" | "completed"

  // Scheduling
  startDate?: Date | null;
  endDate?: Date | null;
  durationDays?: number;
  blockedWeekdays?: number[];
  blockedDates?: string[];

  // Dependencies
  predecessors?: string[];
  successors?: string[];

  // Subtasks => each must remain within main [startDate, endDate] if present
  subtasks?: SubTask[];

  // NEW: constraints
  constraints?: TaskConstraints;

  // NEW: resources
  resources?: TaskResources;

  // Firestore
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createTask
 */
export async function createTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<TaskDoc, "id">
): Promise<string> {
  // If user provided startDate/duration => compute endDate ignoring blocked
  if (data.startDate instanceof Date && typeof data.durationDays === "number") {
    data.endDate = computeEndDateIgnoringBlocked(
      data.startDate,
      data.durationDays,
      data.blockedWeekdays || [0, 6],
      data.blockedDates || []
    );
  }

  // clamp subtasks if any
  if (data.subtasks && data.startDate && data.endDate) {
    data.subtasks = clampAllSubtasks(
      data.subtasks,
      data.startDate,
      data.endDate,
      data.blockedWeekdays || [0, 6],
      data.blockedDates || []
    );
  }

  const tasksColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks"
  );
  const docRef = await addDoc(tasksColl, {
    ...stripDates(data),
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchTask
 */
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
  if (!snap.exists()) {
    throw new Error("Task not found");
  }
  const raw = { id: snap.id, ...snap.data() };
  const converted = convertAllDates(raw);
  return converted as TaskDoc;
}

/**
 * fetchAllTasks
 */
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
  const tasks: any[] = snap.docs.map((d) => {
    const raw = { id: d.id, ...d.data() };
    return convertAllDates(raw);
  });
  return tasks as TaskDoc[];
}

/**
 * updateTask
 */
export async function updateTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string,
  updates: Partial<TaskDoc>
) {
  // 1) fetch existing
  const existing = await fetchTask(orgId, projectId, subProjectId, taskId);

  // 2) merge
  const newData: TaskDoc = { ...existing, ...updates };

  // 3) if startDate/duration => recalc end ignoring blocked
  if (newData.startDate instanceof Date && typeof newData.durationDays === "number") {
    newData.endDate = computeEndDateIgnoringBlocked(
      newData.startDate,
      newData.durationDays,
      newData.blockedWeekdays || [0, 6],
      newData.blockedDates || []
    );
  }

  // 4) clamp subtasks
  if (newData.subtasks && newData.startDate && newData.endDate) {
    newData.subtasks = clampAllSubtasks(
      newData.subtasks,
      newData.startDate,
      newData.endDate,
      newData.blockedWeekdays || [0, 6],
      newData.blockedDates || []
    );
  }

  // 5) store
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
    ...stripDates(newData),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteTask
 */
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
}

/**
 * importTasksFromJson
 */
export async function importTasksFromJson(
  orgId: string,
  projectId: string,
  subProjectId: string,
  tasksData: Omit<TaskDoc, "id">[]
) {
  const tasksColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "tasks"
  );
  for (const t of tasksData) {
    const stripped = stripDates(t);
    await addDoc(tasksColl, {
      ...stripped,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });
  }
}

/**
 * exportTasksToJson
 */
export async function exportTasksToJson(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<Omit<TaskDoc, "id">[]> {
  const tasks = await fetchAllTasks(orgId, projectId, subProjectId);
  return tasks.map(({ id, ...rest }) => rest);
}

/**
 * computeEndDateIgnoringBlocked
 * For a main task or subtask that says "I want X working days" from start,
 * skip blocked weekdays/dates.
 */
function computeEndDateIgnoringBlocked(
  start: Date,
  durationDays: number,
  blockedWeekdays: number[],
  blockedDates: string[]
): Date {
  if (durationDays <= 0) {
    return new Date(start.getTime());
  }
  let remaining = durationDays;
  let cur = new Date(start.getTime());

  // We consider day #1 as the start date
  remaining -= 1; // so we move forward only “durationDays - 1” more working days

  while (remaining > 0) {
    cur.setDate(cur.getDate() + 1);

    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);

    if (blockedWeekdays.includes(dow)) {
      continue;
    }
    if (blockedDates.includes(iso)) {
      continue;
    }
    remaining--;
  }
  return cur;
}

/**
 * clampAllSubtasks => ensures each sub is within [mainStart, mainEnd].
 */
function clampAllSubtasks(
  subs: SubTask[],
  mainStart: Date,
  mainEnd: Date,
  blockedWeekdays: number[],
  blockedDates: string[]
): SubTask[] {
  return subs.map((sub) => {
    const sDate = ensureDate(sub.startDate) || new Date(mainStart.getTime());
    let eDate = ensureDate(sub.endDate);

    // If sub has a numeric durationDays, recalc end from sub start ignoring blocked
    if (sDate && typeof sub.durationDays === "number" && sub.durationDays > 0) {
      eDate = computeEndDateIgnoringBlocked(
        sDate,
        sub.durationDays,
        blockedWeekdays,
        blockedDates
      );
    } else if (!eDate) {
      // fallback if not provided
      eDate = new Date(sDate.getTime());
    }

    // clamp subStart
    if (sDate < mainStart) {
      sub.startDate = mainStart;
    } else if (sDate > mainEnd) {
      sub.startDate = new Date(mainEnd.getTime());
    } else {
      sub.startDate = sDate;
    }

    // clamp subEnd
    if (eDate < mainStart) {
      sub.endDate = new Date(mainStart.getTime());
    } else if (eDate > mainEnd) {
      sub.endDate = new Date(mainEnd.getTime());
    } else {
      sub.endDate = eDate;
    }

    return sub;
  });
}
