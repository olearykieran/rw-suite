// src/lib/services/MeetingMinutesService.ts

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

export interface Attendee {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface ActionItem {
  status: string;
  owner: string;
  open: boolean;
  notes?: string;
}

export interface MeetingMinutesDoc {
  id: string;
  title: string;
  date?: Date | null;
  attendees?: Attendee[];
  agenda?: string;
  notes?: string;
  nextMeetingDate?: Date | null;
  attachments?: string[];
  actionItems?: ActionItem[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
  [key: string]: any; // for extras like propertyCode, etc.
}

/**
 * Convert a Firestore Timestamp or null into a JS Date
 */
function coerceFirestoreDate(value: any): Date | null {
  if (!value) return null;
  // If Firestore recognized it as a timestamp, we can do .toDate()
  if (value.toDate) {
    return value.toDate();
  }
  // If it's already a JS Date
  if (value instanceof Date) {
    return value;
  }
  // If it has .seconds
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

/**
 * createMeeting - adds a new doc
 * If you pass a JS Date, Firestore should store it as a Timestamp automatically
 */
export async function createMeeting(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<MeetingMinutesDoc, "id">
): Promise<string> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "meeting-minutes"
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
 * fetchMeeting - get a single doc, converting Timestamps => Date
 */
export async function fetchMeeting(
  orgId: string,
  projectId: string,
  subProjectId: string,
  meetingId: string
): Promise<MeetingMinutesDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "meeting-minutes",
    meetingId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Meeting record not found.");
  }
  const data = snap.data() || {};

  // Convert Timestamp fields
  data.date = coerceFirestoreDate(data.date);
  data.nextMeetingDate = coerceFirestoreDate(data.nextMeetingDate);

  return { id: snap.id, ...data } as MeetingMinutesDoc;
}

/**
 * fetchAllMeetings - list all docs under subproject, converting date fields
 */
export async function fetchAllMeetings(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<MeetingMinutesDoc[]> {
  const collRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "meeting-minutes"
  );
  const snap = await getDocs(collRef);

  return snap.docs.map((d) => {
    const raw = d.data() || {};
    raw.date = coerceFirestoreDate(raw.date);
    raw.nextMeetingDate = coerceFirestoreDate(raw.nextMeetingDate);
    return { id: d.id, ...raw } as MeetingMinutesDoc;
  });
}

/**
 * updateMeeting - partial update
 */
export async function updateMeeting(
  orgId: string,
  projectId: string,
  subProjectId: string,
  meetingId: string,
  updates: Partial<MeetingMinutesDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "meeting-minutes",
    meetingId
  );
  console.log("Updating Firestore with:", updates);
  // Rely on Firestore to auto-convert a JS Date => Timestamp
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteMeeting
 */
export async function deleteMeeting(
  orgId: string,
  projectId: string,
  subProjectId: string,
  meetingId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "meeting-minutes",
    meetingId
  );
  await deleteDoc(docRef);
}

/**
 * uploadMeetingAttachment
 */
export async function uploadMeetingAttachment(
  orgId: string,
  projectId: string,
  subProjectId: string,
  meetingId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `meeting-minutes/${orgId}/${projectId}/${subProjectId}/${meetingId}/${file.name}`
  );
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
