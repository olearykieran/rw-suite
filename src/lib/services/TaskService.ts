// src/lib/services/TaskService.ts

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

export interface SubTask {
  id: string;
  title: string;
  assignedTo?: string; // userId or email
  status?: string; // "notStarted" | "inProgress" | "delayed" | "completed"
  startDate?: Date | null;
  endDate?: Date | null;
  description?: string;
}

export interface TaskDoc {
  id: string;
  title: string;
  description?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  assignedTo?: string; // userId or email
  priority?: string; // "low" | "medium" | "high"
  status?: string; // "notStarted" | "inProgress" | "delayed" | "completed"
  subtasks?: SubTask[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createTask
 * Creates a new top-level task doc in Firestore.
 * If you want nested tasks, you can either store subTasks[] inline or store them in a subcollection.
 */
export async function createTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<TaskDoc, "id">
): Promise<string> {
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
    ...data,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchTask
 * Retrieve a single task from Firestore.
 */
export async function fetchTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string
): Promise<TaskDoc> {
  const docRef = doc(
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
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Task not found");
  }
  return { id: snap.id, ...snap.data() } as TaskDoc;
}

/**
 * fetchAllTasks
 * Return all tasks in that subproject. Sort them by createdAt if you want.
 */
export async function fetchAllTasks(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<TaskDoc[]> {
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
  const snap = await getDocs(tasksColl);
  const tasks = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as TaskDoc[];

  // optionally sort by startDate or createdAt
  return tasks;
}

/**
 * updateTask
 * Partial update of a single Task doc.
 */
export async function updateTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string,
  updates: Partial<TaskDoc>
) {
  const docRef = doc(
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
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteTask
 * Removes the task doc from Firestore.
 */
export async function deleteTask(
  orgId: string,
  projectId: string,
  subProjectId: string,
  taskId: string
) {
  const docRef = doc(
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
  await deleteDoc(docRef);
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
    await addDoc(tasksColl, {
      ...t,
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
