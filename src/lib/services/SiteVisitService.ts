import { firestore, auth } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Represents a Site Visit Entry.
 */
export interface SiteVisitEntry {
  id: string;
  timestamp: string; // ISO date string
  note?: string;
  photos?: {
    url: string;
    annotations?: any; // JSON data for annotations; you may define a more strict type if needed
  }[];
  voiceNotes?: string[];
}

/**
 * SiteVisitDoc represents the structure of a Site Visit document.
 * It optionally includes an entries array.
 */
export interface SiteVisitDoc {
  id?: string;
  visitDate: string;
  participants: string[];
  notes?: string;
  photos?: {
    url: string;
    annotations?: any;
  }[];
  voiceNotes?: string[];
  entries?: SiteVisitEntry[];
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * ExtendedSiteVisitDoc extends SiteVisitDoc to ensure that entries is always defined.
 */
export interface ExtendedSiteVisitDoc extends SiteVisitDoc {
  entries: SiteVisitEntry[];
}

/**
 * Create a new Site Visit document.
 */
export async function createSiteVisit(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitData: {
    visitDate: string;
    participants: string[];
    notes?: string;
    files?: FileList | null; // Photos
    audioFiles?: FileList | null; // Voice notes
  }
): Promise<string> {
  const { visitDate, participants, notes, files, audioFiles } = siteVisitData;
  const siteVisitId = `${Date.now()}`;
  const storage = getStorage();
  const photoData: { url: string; annotations?: any }[] = [];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileRef = ref(
        storage,
        `siteVisits/${orgId}/${projectId}/${subProjectId}/${siteVisitId}/photos/${file.name}`
      );
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      photoData.push({ url: downloadURL, annotations: [] });
    }
  }

  const audioUrls: string[] = [];
  if (audioFiles && audioFiles.length > 0) {
    for (let i = 0; i < audioFiles.length; i++) {
      const audio = audioFiles[i];
      const audioRef = ref(
        storage,
        `siteVisits/${orgId}/${projectId}/${subProjectId}/${siteVisitId}/voiceNotes/${audio.name}`
      );
      await uploadBytes(audioRef, audio);
      const downloadURL = await getDownloadURL(audioRef);
      audioUrls.push(downloadURL);
    }
  }

  const docData: SiteVisitDoc = {
    visitDate,
    participants,
    notes: notes || "",
    photos: photoData,
    voiceNotes: audioUrls,
    entries: [],
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  };

  const collectionRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "siteVisits"
  );
  const docRef = doc(collectionRef, siteVisitId);
  await setDoc(docRef, docData);
  return siteVisitId;
}

/**
 * Fetch a single Site Visit document.
 */
export async function fetchSiteVisit(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitId: string
): Promise<SiteVisitDoc> {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "siteVisits",
    siteVisitId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("SiteVisit not found");
  }
  return { id: snap.id, ...snap.data() } as SiteVisitDoc;
}

/**
 * Fetch all Site Visits for a subProject.
 */
export async function fetchAllSiteVisits(
  orgId: string,
  projectId: string,
  subProjectId: string
): Promise<SiteVisitDoc[]> {
  const collectionRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "siteVisits"
  );
  const snap = await getDocs(collectionRef);
  const docs: SiteVisitDoc[] = [];
  snap.forEach((doc) => {
    docs.push({ id: doc.id, ...doc.data() } as SiteVisitDoc);
  });
  return docs;
}

/**
 * Update a Site Visit document.
 */
export async function updateSiteVisit(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitId: string,
  updates: Partial<SiteVisitDoc>
) {
  const docRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "siteVisits",
    siteVisitId
  );
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * Update or insert annotations on a photo.
 */
export async function updatePhotoAnnotation(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitId: string,
  photoUrl: string,
  newAnnotations: any
) {
  const siteVisitData = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);
  const newPhotos = siteVisitData.photos?.map((photo) => {
    if (photo.url === photoUrl) {
      return { ...photo, annotations: newAnnotations };
    }
    return photo;
  });
  await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
    photos: newPhotos,
  });
}
