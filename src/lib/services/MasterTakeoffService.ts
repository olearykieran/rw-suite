/**
 * src/lib/services/MasterTakeoffService.ts
 */

import { firestore, auth } from "@/lib/firebaseConfig";
import {
  doc,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * A single line item in the master takeoff.
 * Each item is associated with a trade (e.g. "Plumbing"),
 * has a description, and optionally quantity, unit cost, etc.
 */
export interface MasterTakeoffItem {
  id?: string; // optional local ID
  trade?: string; // e.g. "Plumbing", "Electrical"
  description?: string; // e.g. "16 Toilets"
  csiCode?: string; // optional "22 40 00" or "DIV-22"
  quantity?: number; // from your takeoff
  unit?: string; // e.g. "EA", "LF"
  estimatedCost?: number; // optional
  [key: string]: any;
}

/**
 * The MasterTakeoffDoc stores an array of items for the entire subProject’s takeoff.
 */
export interface MasterTakeoffDoc {
  id: string; // Firestore doc ID
  subProjectId: string; // link back to subProject
  name?: string; // e.g. "Master Takeoff V1"
  items: MasterTakeoffItem[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
  [key: string]: any;
}

/**
 * createMasterTakeoff - create a new doc in subcollection "master-takeoff"
 */
export async function createMasterTakeoff(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<MasterTakeoffDoc, "id" | "subProjectId">
): Promise<string> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "master-takeoff"
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
 * fetchMasterTakeoff - retrieve a single doc by ID
 */
export async function fetchMasterTakeoff(
  orgId: string,
  projectId: string,
  subProjectId: string,
  takeoffId: string
): Promise<MasterTakeoffDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "master-takeoff",
    takeoffId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Master Takeoff record not found.");
  }
  const raw = snap.data() || {};
  return { id: snap.id, ...raw } as MasterTakeoffDoc;
}

/**
 * fetchAllMasterTakeoffs - list them for a subProject
 */
export async function fetchAllMasterTakeoffs(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<MasterTakeoffDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "master-takeoff"
  );
  const snap = await getDocs(collRef);
  return snap.docs.map((d) => {
    const raw = d.data() || {};
    return { id: d.id, ...raw } as MasterTakeoffDoc;
  });
}

/**
 * updateMasterTakeoff - partial update
 */
export async function updateMasterTakeoff(
  orgId: string,
  projectId: string,
  subProjectId: string,
  takeoffId: string,
  updates: Partial<MasterTakeoffDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "master-takeoff",
    takeoffId
  );

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteMasterTakeoff
 */
export async function deleteMasterTakeoff(
  orgId: string,
  projectId: string,
  subProjectId: string,
  takeoffId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "master-takeoff",
    takeoffId
  );
  await deleteDoc(docRef);
}
