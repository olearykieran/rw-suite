// src/lib/services/DailyReportService.ts

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
 * A DailyReportDoc might look like:
 * {
 *   id: string;
 *   date: string;             // e.g. "2024-12-30"
 *   weatherNote?: string;     // e.g. "Sunny, 65F" or "Partly cloudy, 75F"
 *   location?: string;        // if you want to store project location or site
 *   incidents?: string[];     // brief descriptions
 *   progressNotes?: string;   // what was completed this day
 *   delays?: string;          // any reason for delay
 *   attachments?: string[];   // optional photos or docs
 *   createdAt?: any;
 *   createdBy?: string | null;
 *   updatedAt?: any;
 *   updatedBy?: string | null;
 * }
 */
export interface DailyReportDoc {
  id: string;
  date: string;
  weatherNote?: string;
  location?: string;
  incidents?: string[];
  progressNotes?: string;
  delays?: string;
  attachments?: string[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * createDailyReport - add a new daily report doc
 */
export async function createDailyReport(
  orgId: string,
  projectId: string,
  subProjectId: string,
  data: Omit<DailyReportDoc, "id">
): Promise<string> {
  const drColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "daily-reports"
  );
  const docRef = await addDoc(drColl, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
  return docRef.id;
}

/**
 * fetchDailyReport - get a single daily report
 */
export async function fetchDailyReport(
  orgId: string,
  projectId: string,
  subProjectId: string,
  dailyReportId: string
): Promise<DailyReportDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "daily-reports",
    dailyReportId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Daily report not found.");
  }
  return { id: snap.id, ...snap.data() } as DailyReportDoc;
}

/**
 * fetchAllDailyReports - list all daily reports
 */
export async function fetchAllDailyReports(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<DailyReportDoc[]> {
  const drColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "daily-reports"
  );
  const snap = await getDocs(drColl);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyReportDoc[];
}

/**
 * updateDailyReport - partial update
 */
export async function updateDailyReport(
  orgId: string,
  projectId: string,
  subProjectId: string,
  dailyReportId: string,
  updates: Partial<DailyReportDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "daily-reports",
    dailyReportId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * deleteDailyReport - remove a single daily report doc
 */
export async function deleteDailyReport(
  orgId: string,
  projectId: string,
  subProjectId: string,
  dailyReportId: string
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "daily-reports",
    dailyReportId
  );
  await deleteDoc(docRef);
}

/**
 * uploadDailyReportAttachment - upload a file to storage, return download URL
 */
export async function uploadDailyReportAttachment(
  orgId: string,
  projectId: string,
  subProjectId: string,
  dailyReportId: string,
  file: File
): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(
    storage,
    `daily-reports/${orgId}/${projectId}/${subProjectId}/${dailyReportId}/${file.name}`
  );
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

/**
 * getWeatherNote - optionally fetch real weather data.
 * For demonstration, we just return a stub string.
 *
 * In a real setup, you'd do something like:
 *   const apiKey = ... (from your environment)
 *   const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
 *   const resp = await fetch(url);
 *   const data = await resp.json();
 *   // parse out a summary like "Sunny, 68F"
 *
 */
export async function getWeatherNote(location: string): Promise<string> {
  // Stub out
  return `Weather data (stub) for ${location}`;
}
