// src/lib/services/VendorService.ts

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

/** Type for a single vendor doc */
export interface VendorDoc {
  id: string;
  name: string;
  trade?: string; // e.g. "Plumbing", "Electrical"
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createVendor - add a new vendor doc in /organizations/{orgId}/vendors
 */
export async function createVendor(
  orgId: string,
  data: Omit<VendorDoc, "id">
): Promise<string> {
  const collRef = collection(firestore, "organizations", orgId, "vendors");
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
 * fetchAllVendors - list all vendors under /organizations/{orgId}/vendors
 */
export async function fetchAllVendors(orgId: string): Promise<VendorDoc[]> {
  const collRef = collection(firestore, "organizations", orgId, "vendors");
  const snap = await getDocs(collRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<VendorDoc, "id">),
  }));
}

/**
 * fetchVendor - get a single vendor doc by ID
 */
export async function fetchVendor(orgId: string, vendorId: string): Promise<VendorDoc> {
  const docRef = doc(firestore, "organizations", orgId, "vendors", vendorId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Vendor not found.");
  }
  return { id: snap.id, ...(snap.data() as Omit<VendorDoc, "id">) };
}

/**
 * updateVendor - partial updates on a single vendor doc
 */
export async function updateVendor(
  orgId: string,
  vendorId: string,
  updates: Partial<VendorDoc>
) {
  const docRef = doc(firestore, "organizations", orgId, "vendors", vendorId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteVendor - remove a vendor doc
 */
export async function deleteVendor(orgId: string, vendorId: string) {
  const docRef = doc(firestore, "organizations", orgId, "vendors", vendorId);
  await deleteDoc(docRef);
}
