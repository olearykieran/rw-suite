// src/lib/services/BlueprintService.ts

import { firestore, auth } from "@/lib/firebaseConfig";
import {
  doc,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface BlueprintAnnotation {
  id: string;

  // For PDF usage:
  pageNumber?: number;
  xPct?: number;
  yPct?: number;

  // For image usage:
  x?: number;
  y?: number;

  // Pin styling or type
  pinColor?: string;
  pinType?: string; // 'dot', 'triangle', 'star', etc.

  // Ties to a doc
  docType?: string; // 'rfi', 'submittal', etc.
  docId?: string;

  notes?: string;
}

interface BlueprintDoc {
  title: string;
  fileUrl: string;
  annotations: BlueprintAnnotation[];
  createdAt: any;
  createdBy: string | null;
}

export async function createBlueprint(
  orgId: string,
  projectId: string,
  subProjectId: string,
  title: string,
  file: File
) {
  const storage = getStorage();
  const blueprintRef = ref(storage, `blueprints/${orgId}/${projectId}/${file.name}`);
  await uploadBytes(blueprintRef, file);
  const downloadURL = await getDownloadURL(blueprintRef);

  const blueprintColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "blueprints"
  );

  const docRef = await addDoc(blueprintColl, {
    title,
    fileUrl: downloadURL,
    annotations: [],
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
  });

  return docRef.id;
}

export async function fetchBlueprint(
  orgId: string,
  projectId: string,
  subProjectId: string,
  blueprintId: string
): Promise<BlueprintDoc & { id: string }> {
  const bpRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "blueprints",
    blueprintId
  );
  const snap = await getDoc(bpRef);
  if (!snap.exists()) {
    throw new Error("Blueprint not found.");
  }
  return { id: snap.id, ...snap.data() } as any;
}

export async function updateAnnotations(
  orgId: string,
  projectId: string,
  subProjectId: string,
  blueprintId: string,
  annotations: BlueprintAnnotation[]
) {
  const bpRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "blueprints",
    blueprintId
  );
  await updateDoc(bpRef, {
    annotations,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

export async function fetchAllBlueprints(
  orgId: string,
  projectId: string,
  subProjectId: string
) {
  if (!orgId || !projectId || !subProjectId) {
    throw new Error("orgId, projectId, subProjectId are required.");
  }

  const bpColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "blueprints"
  );
  const snaps = await getDocs(bpColl);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
}
