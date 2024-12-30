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
 * MeetingMinutesDoc interface:
 * - title: e.g. "Weekly Coordination Meeting"
 * - date: date/time of the meeting
 * - attendees: array of user IDs or strings
 * - agenda: an array or string of agenda items
 * - notes: final notes of the meeting
 * - attachments: PDF or other docs
 * - nextMeetingDate: optional date for next meeting
 */
export interface MeetingMinutesDoc {
  id: string;
  title: string;
  date?: Date | null;
  attendees?: string[]; // user IDs, emails, or just names
  agenda?: string; // or string[] if you want multi-bullet
  notes?: string; // final summary of what was discussed
  nextMeetingDate?: Date | null;
  attachments?: string[]; // file URLs
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
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
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchMeeting - get a single meeting doc
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
  return { id: snap.id, ...snap.data() } as MeetingMinutesDoc;
}

/**
 * fetchAllMeetings - list all meeting-minutes under subproject
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MeetingMinutesDoc[];
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
  return await getDownloadURL(fileRef);
}
