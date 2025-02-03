// src/lib/services/LightingScheduleService.ts

import { firestore, auth } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * LightingScheduleItem - a single line item extracted from a lighting schedule.
 */
export interface LightingScheduleItem {
  fixtureType?: string; // e.g., "LED FIXTURE", "FLUSH MOUNT", "NO FIXTURES"
  wattage?: number; // numeric wattage if available
  location?: string; // e.g., "OFFICE", "CLOSET", etc.
  manufacturer?: string; // manufacturer name or code if available
  controlMethod?: string; // e.g., "CONTROLLED BY JAMB SWITCH"
  cost?: number; // estimated cost if provided
  [key: string]: any;
}

/**
 * LightingScheduleDoc - represents the entire parsed lighting schedule.
 */
export interface LightingScheduleDoc {
  id: string; // Firestore document ID
  subProjectId: string; // Link back to the subProject
  name?: string; // Schedule name (user provided)
  rawText?: string; // Raw text extracted from the PDF
  parsedData: LightingScheduleItem[]; // Array of parsed lighting items
  pdfUrl?: string; // URL of the uploaded PDF file (if stored)
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
  [key: string]: any;
}

/**
 * createLightingSchedule - create a new lighting schedule document.
 */
export async function createLightingSchedule(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<LightingScheduleDoc, "id" | "subProjectId">
): Promise<string> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "lighting-schedules"
  );
  const docRef = await addDoc(collRef, {
    ...data,
    subProjectId,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchLightingSchedule - retrieve a single lighting schedule by ID.
 */
export async function fetchLightingSchedule(
  orgId: string,
  projectId: string,
  subProjectId: string,
  scheduleId: string
): Promise<LightingScheduleDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "lighting-schedules",
    scheduleId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Lighting schedule not found.");
  }
  const data = snap.data() || {};
  return { id: snap.id, ...data } as LightingScheduleDoc;
}

/**
 * fetchAllLightingSchedules - list all lighting schedules for a subProject.
 */
export async function fetchAllLightingSchedules(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<LightingScheduleDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "lighting-schedules"
  );
  const snap = await getDocs(collRef);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return { id: docSnap.id, ...data } as LightingScheduleDoc;
  });
}

/**
 * updateLightingSchedule - update an existing lighting schedule document.
 */
export async function updateLightingSchedule(
  orgId: string,
  projectId: string,
  subProjectId: string,
  scheduleId: string,
  updates: Partial<LightingScheduleDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "lighting-schedules",
    scheduleId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteLightingSchedule - remove a lighting schedule document.
 */
export async function deleteLightingSchedule(
  orgId: string,
  projectId: string,
  subProjectId: string,
  scheduleId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "lighting-schedules",
    scheduleId
  );
  await deleteDoc(docRef);
}
