// src/lib/services/BidLevelerService.ts

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
 * BidDoc - the interface for storing a single bid in Firestore
 */
export interface BidDoc {
  id: string; // Firestore document ID
  trade: string; // e.g. "Plumbing", "Electrical"
  contractor: string; // e.g. "P.H. Works Inc."
  bidAmount?: number; // total cost from the bid
  submissionDate?: Date | null;
  notes?: string; // any text note, e.g. "Excludes permits"
  scopeOfWork?: string; // or you could store a JSON array
  exclusions?: string; // or a JSON array of strings
  attachments?: string[]; // file URLs
  // Timestamps
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
  [key: string]: any; // for other fields like propertyCode, etc.
}

/**
 * coerceFirestoreDate(value) - convert a Firestore timestamp into a JS Date
 */
function coerceFirestoreDate(value: any): Date | null {
  if (!value) return null;
  if (value.toDate) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

/**
 * createBid - create a new bid doc in Firestore
 */
export async function createBid(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<BidDoc, "id">
): Promise<string> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bids" // the new sub-collection name
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
 * fetchBid - retrieve a single bid doc by ID
 */
export async function fetchBid(
  orgId: string,
  projectId: string,
  subProjectId: string,
  bidId: string
): Promise<BidDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bids",
    bidId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Bid record not found.");
  }

  const raw = snap.data() || {};
  raw.submissionDate = coerceFirestoreDate(raw.submissionDate);

  return { id: snap.id, ...raw } as BidDoc;
}

/**
 * fetchAllBids - list all the bids under a specific subProject
 */
export async function fetchAllBids(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<BidDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bids"
  );

  const snap = await getDocs(collRef);

  return snap.docs.map((d) => {
    const raw = d.data() || {};
    raw.submissionDate = coerceFirestoreDate(raw.submissionDate);
    return { id: d.id, ...raw } as BidDoc;
  });
}

/**
 * updateBid - partial update of an existing bid
 */
export async function updateBid(
  orgId: string,
  projectId: string,
  subProjectId: string,
  bidId: string,
  updates: Partial<BidDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bids",
    bidId
  );

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteBid - remove a bid doc
 */
export async function deleteBid(
  orgId: string,
  projectId: string,
  subProjectId: string,
  bidId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "bids",
    bidId
  );
  await deleteDoc(docRef);
}

/**
 * uploadBidAttachment
 * - store attachments under "bids/{orgId}/{projectId}/{subProjectId}/{bidId}/..."
 */
export async function uploadBidAttachment(
  orgId: string,
  projectId: string,
  subProjectId: string,
  bidId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `bids/${orgId}/${projectId}/${subProjectId}/${bidId}/${file.name}`
  );
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
