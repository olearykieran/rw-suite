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

/**
 * Attendee structure
 */
export interface Attendee {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

/**
 * Action item structure:
 * - status: short description of the to-do (e.g. "Remove church pews")
 * - owner: who is responsible (e.g. "Kieran")
 * - open: boolean indicating if it's still open/closed
 * - notes?: optional
 */
export interface ActionItem {
  status: string;
  owner: string;
  open: boolean;
  notes?: string;
}

/**
 * MeetingMinutesDoc interface:
 * - date, nextMeetingDate are now real Date or null after we coerce them
 */
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
  // optionally propertyCode, preparedBy, location...
  [key: string]: any; // so you can store extra fields if needed
}

/**
 * A small helper to convert a Firestore Timestamp or null into a real JS Date.
 * If it’s already a Date, we keep it. Otherwise if it's a Timestamp with .seconds, convert it.
 */
function coerceFirestoreDate(value: any): Date | null {
  if (!value) return null; // no date
  // If already a Date object
  if (value instanceof Date) return value;
  // If Firestore Timestamp (with .seconds)
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  // else, fallback
  return null;
}

/**
 * createMeeting - adds a new meeting minutes doc
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
    // Firestore will store the date fields as Timestamps automatically
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchMeeting - get a single meeting doc, converting Timestamps to real JS Dates
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

  // Convert possible Timestamp fields to Date
  data.date = coerceFirestoreDate(data.date);
  data.nextMeetingDate = coerceFirestoreDate(data.nextMeetingDate);

  return { id: snap.id, ...data } as MeetingMinutesDoc;
}

/**
 * fetchAllMeetings - list all meeting-minutes under subproject,
 * converting Timestamps to JS Dates
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

  const results: MeetingMinutesDoc[] = snap.docs.map((d) => {
    const raw = d.data() || {};
    // coerce date fields
    raw.date = coerceFirestoreDate(raw.date);
    raw.nextMeetingDate = coerceFirestoreDate(raw.nextMeetingDate);

    return { id: d.id, ...raw } as MeetingMinutesDoc;
  });
  return results;
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
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteMeeting - remove a meeting doc
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
 * uploadMeetingAttachment - store an attachment in Firebase Storage
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
