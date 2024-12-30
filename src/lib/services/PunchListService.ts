// src/lib/services/PunchListService.ts

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
 * PunchListDoc describes the Punch List itself.
 *   - title: e.g. "Phase 1 Interior Punch"
 *   - description: optional summary
 *   - status: e.g. "open", "inProgress", "resolved", "closed"
 *   - items: array of PunchItem (or subcollection)
 *   - attachments: optional docs or images
 */
export interface PunchListDoc {
  id: string;
  title: string;
  description?: string;
  status?: string; // "open" | "inProgress" | "closed"
  items?: PunchItem[];
  attachments?: string[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * PunchItem describes each individual item within a punch list.
 *   - title: e.g. "Patch drywall in corridor"
 *   - location: e.g. "Corridor near room 101"
 *   - assignedTo: user or subcontractor ID
 *   - dueDate: deadline to fix
 *   - resolved: boolean or separate status
 */
export interface PunchItem {
  id: string;
  title: string;
  location?: string;
  assignedTo?: string;
  dueDate?: Date | null;
  status?: string; // "open", "done", etc.
  notes?: string;
}

/**
 * createPunchList - create a new punch list doc
 */
export async function createPunchList(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<PunchListDoc, "id">
): Promise<string> {
  const plColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "punch-lists"
  );

  const docRef = await addDoc(plColl, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchPunchList - get single punch list by ID
 */
export async function fetchPunchList(
  orgId: string,
  projectId: string,
  subProjectId: string,
  punchListId: string
): Promise<PunchListDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "punch-lists",
    punchListId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Punch list not found.");
  }
  return { id: snap.id, ...snap.data() } as PunchListDoc;
}

/**
 * fetchAllPunchLists - list them all
 */
export async function fetchAllPunchLists(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<PunchListDoc[]> {
  const plColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "punch-lists"
  );
  const snap = await getDocs(plColl);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PunchListDoc[];
}

/**
 * updatePunchList - partial update
 */
export async function updatePunchList(
  orgId: string,
  projectId: string,
  subProjectId: string,
  punchListId: string,
  updates: Partial<PunchListDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "punch-lists",
    punchListId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deletePunchList - remove entire punch list doc
 */
export async function deletePunchList(
  orgId: string,
  projectId: string,
  subProjectId: string,
  punchListId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "punch-lists",
    punchListId
  );
  await deleteDoc(docRef);
}

/**
 * uploadPunchListAttachment - store a file in storage => return URL
 */
export async function uploadPunchListAttachment(
  orgId: string,
  projectId: string,
  subProjectId: string,
  punchListId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `punch-lists/${orgId}/${projectId}/${subProjectId}/${punchListId}/${file.name}`
  );
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
