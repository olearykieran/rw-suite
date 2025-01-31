// File: src/lib/services/SiteVisitService.ts

import { firestore, auth } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
  addDoc,
  runTransaction,
  DocumentData,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Represents the structure of a Site Visit document
 */
export interface SiteVisitDoc {
  id?: string;
  visitDate: string; // or store as a Timestamp/Date if you prefer
  participants: string[];
  notes?: string;
  photos?: {
    url: string;
    annotations?: any; // JSON for annotation data
  }[];
  voiceNotes?: string[]; // Array of audio file URLs
  createdAt?: any;
  createdBy?: string | null;
  updatedAt?: any;
  updatedBy?: string | null;
}

/**
 * Create a new Site Visit doc in Firestore
 */
export async function createSiteVisit(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitData: {
    visitDate: string;
    participants: string[];
    notes?: string;
    files?: FileList | null; // optional photos
    audioFiles?: FileList | null; // optional voice notes
  }
): Promise<string> {
  const { visitDate, participants, notes, files, audioFiles } = siteVisitData;

  // Generate a doc ID. You can also let Firestore auto-gen if you prefer:
  const siteVisitId = `${Date.now()}`;
  // Or simply do:
  // const docRef = doc(collection(firestore, ...));
  // and use docRef.id

  const storage = getStorage();
  const photoData = [];

  // -- Upload images if present
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileRef = ref(
        storage,
        `siteVisits/${orgId}/${projectId}/${subProjectId}/${siteVisitId}/photos/${file.name}`
      );
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      photoData.push({
        url: downloadURL,
        annotations: [],
      });
    }
  }

  // -- Upload audio if present
  const audioUrls = [];
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

  // Build doc data
  const docData: SiteVisitDoc = {
    visitDate,
    participants,
    notes: notes || "",
    photos: photoData,
    voiceNotes: audioUrls,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  };

  // Save it to Firestore
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
 * Fetch a single Site Visit
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
 * Fetch all Site Visits in a subProject
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
 * Update a Site Visit
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
 * For updating or inserting an annotation on a photo
 */
export async function updatePhotoAnnotation(
  orgId: string,
  projectId: string,
  subProjectId: string,
  siteVisitId: string,
  photoUrl: string,
  newAnnotations: any
) {
  // 1) Fetch site visit
  const siteVisitData = await fetchSiteVisit(orgId, projectId, subProjectId, siteVisitId);

  // 2) Find the photo in the siteVisitData.photos array
  const newPhotos = siteVisitData.photos?.map((photo) => {
    if (photo.url === photoUrl) {
      return {
        ...photo,
        annotations: newAnnotations,
      };
    }
    return photo;
  });

  // 3) Update doc
  await updateSiteVisit(orgId, projectId, subProjectId, siteVisitId, {
    photos: newPhotos,
  });
}
