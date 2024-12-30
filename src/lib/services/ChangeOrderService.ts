// src/lib/services/ChangeOrderService.ts

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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * A ChangeOrderDoc might look like:
 * {
 *   id: string;
 *   title: string;           // e.g., "CO #001 - Additional Excavation"
 *   description?: string;    // summary of the scope change
 *   reason?: string;         // e.g. "Design change", "Owner request", etc.
 *   status?: string;         // "draft", "submitted", "approved", "rejected", etc.
 *   costImpact?: number;     // e.g. $5000
 *   scheduleImpact?: number; // in days
 *   attachments?: string[];  // file URLs
 *   createdAt?: any;
 *   createdBy?: string | null;
 *   updatedAt?: any;
 *   updatedBy?: string | null;
 * }
 */
export interface ChangeOrderDoc {
  id: string;
  title: string;
  description?: string;
  reason?: string;
  status?: string;
  costImpact?: number;
  scheduleImpact?: number;
  attachments?: string[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createChangeOrder - add a new change order doc
 */
export async function createChangeOrder(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<ChangeOrderDoc, "id">
): Promise<string> {
  const coColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "change-orders"
  );
  const docRef = await addDoc(coColl, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchChangeOrder - get a single change order by ID
 */
export async function fetchChangeOrder(
  orgId: string,
  projectId: string,
  subProjectId: string,
  coId: string
): Promise<ChangeOrderDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "change-orders",
    coId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Change order not found.");
  }
  return { id: snap.id, ...snap.data() } as ChangeOrderDoc;
}

/**
 * fetchAllChangeOrders - list all change orders
 */
export async function fetchAllChangeOrders(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<ChangeOrderDoc[]> {
  const coColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "change-orders"
  );
  const snap = await getDocs(coColl);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ChangeOrderDoc[];
}

/**
 * updateChangeOrder - partial update
 */
export async function updateChangeOrder(
  orgId: string,
  projectId: string,
  subProjectId: string,
  coId: string,
  updates: Partial<ChangeOrderDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "change-orders",
    coId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteChangeOrder - remove a single change order doc
 */
export async function deleteChangeOrder(
  orgId: string,
  projectId: string,
  subProjectId: string,
  coId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "change-orders",
    coId
  );
  await deleteDoc(docRef);
}

/**
 * uploadChangeOrderAttachment - store an attachment in Firebase Storage
 */
export async function uploadChangeOrderAttachment(
  orgId: string,
  projectId: string,
  subProjectId: string,
  coId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `change-orders/${orgId}/${projectId}/${subProjectId}/${coId}/${file.name}`
  );
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
