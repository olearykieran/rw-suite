// src/lib/services/FinanceService.ts
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
 * FinanceDoc represents a single finance record:
 * e.g. an invoice, an expense, a payment, etc.
 */
export interface FinanceDoc {
  id: string;
  type: string; // e.g. "invoice", "expense", "bill", "receipt", etc.
  description?: string;
  amount: number;
  vendorId?: string | null;
  contractorId?: string | null;
  date?: Date | null; // date of transaction
  dueDate?: Date | null; // if it’s an invoice/bill
  status?: string; // e.g. "paid", "unpaid", "partial", "overdue"
  attachments?: string[]; // receipt file URLs or PDF links
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createFinance - adds a new finance doc
 */
export async function createFinance(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<FinanceDoc, "id">
): Promise<string> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "finances"
  );
  const docRef = await addDoc(collRef, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchFinance - get a single finance doc by ID
 */
export async function fetchFinance(
  orgId: string,
  projectId: string,
  subProjectId: string,
  financeId: string
): Promise<FinanceDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "finances",
    financeId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Finance record not found.");
  }
  return { id: snap.id, ...snap.data() } as FinanceDoc;
}

/**
 * fetchAllFinances - list all finances under a subProject
 */
export async function fetchAllFinances(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<FinanceDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "finances"
  );
  const snap = await getDocs(collRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FinanceDoc[];
}

/**
 * updateFinance - partial update
 */
export async function updateFinance(
  orgId: string,
  projectId: string,
  subProjectId: string,
  financeId: string,
  updates: Partial<FinanceDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "finances",
    financeId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteFinance - remove a finance doc
 */
export async function deleteFinance(
  orgId: string,
  projectId: string,
  subProjectId: string,
  financeId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "finances",
    financeId
  );
  await deleteDoc(docRef);
}

/**
 * uploadReceipt - optional function to store a receipt file in Firebase Storage
 * returns the download URL
 */
export async function uploadReceipt(
  orgId: string,
  projectId: string,
  subProjectId: string,
  financeId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(
    storage,
    `finances/${orgId}/${projectId}/${subProjectId}/${financeId}/${file.name}`
  );
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
