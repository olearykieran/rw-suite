// src/lib/services/RfiService.ts
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
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface CreateRfiInput {
  orgId: string;
  projectId: string;
  subProjectId: string;
  subject: string;
  question: string;
  assignedTo: string;
  distributionList: string[];
  dueDate?: string | null;
  status: string;
  importance: string;
  files?: FileList | null;
  createdByEmail?: string;
}

/**
 * Increments a global RFI counter doc and returns the next integer.
 * You can store counters in `counters/rfiCounter` or by org, etc.
 */
async function getNextRfiNumber(): Promise<number> {
  const counterRef = doc(firestore, "counters", "rfiCounter");
  let newVal = 1; // fallback if doc doesn't exist

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(counterRef);
    if (!snap.exists()) {
      // If doc doesn't exist, create it with initial 1
      transaction.set(counterRef, { value: 1 });
      newVal = 1;
    } else {
      const data = snap.data();
      const currentVal = data.value || 0;
      newVal = currentVal + 1;
      transaction.update(counterRef, { value: newVal });
    }
  });

  return newVal;
}

/**
 * Creates a new RFI in Firestore, uploading any attachments
 */
export async function createRfi(input: CreateRfiInput): Promise<string> {
  const {
    orgId,
    projectId,
    subProjectId,
    subject,
    question,
    assignedTo,
    distributionList,
    dueDate,
    status,
    importance,
    files,
    createdByEmail,
  } = input;

  console.log("[createRfi] user:", auth.currentUser?.uid);

  // 1) Generate the numeric rfiNumber
  const rfiNumber = await getNextRfiNumber();

  // 2) Generate doc ID from subject or random
  const rfiId =
    subject.toLowerCase().replace(/\s+/g, "-") || Math.random().toString(36).slice(2);

  // 3) Upload attachments (if any)
  const attachmentUrls: string[] = [];
  if (files && files.length > 0) {
    const storage = getStorage();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileRef = ref(
        storage,
        `rfis/${orgId}/${projectId}/${subProjectId}/${rfiId}/${file.name}`
      );
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      attachmentUrls.push(downloadURL);
      console.log("[createRfi] uploaded:", file.name, "->", downloadURL);
    }
  }

  const rfiRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId
  );

  await setDoc(rfiRef, {
    rfiNumber,
    subject,
    question,
    assignedTo,
    distributionList,
    dueDate: dueDate ? new Date(dueDate) : null,
    status,
    importance,
    attachments: attachmentUrls,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    createdByEmail: createdByEmail || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
    triggersChangeOrder: false,
    officialResponse: null,
    responseDate: null,
  });

  console.log("[createRfi] doc created with rfiNumber:", rfiNumber);

  // Add initial activity
  await addActivity(orgId, projectId, subProjectId, rfiId, {
    message: `RFI #${rfiNumber} created: "${subject}"`,
    userId: auth.currentUser?.uid,
  });

  return rfiId;
}

/**
 * fetchRfi - retrieves a single RFI by doc ID
 */
export async function fetchRfi(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string
) {
  const rfiRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId
  );
  const snap = await getDoc(rfiRef);
  if (!snap.exists()) {
    throw new Error("RFI not found.");
  }
  return { id: snap.id, ...snap.data() };
}

/**
 * updateRfi - partial update of an RFI doc
 */
export async function updateRfi(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string,
  updates: Record<string, any>
) {
  const rfiRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId
  );
  await updateDoc(rfiRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * fetchAllRfis - returns all RFI docs in subcollection
 */
export async function fetchAllRfis(
  orgId: string,
  projectId: string,
  subProjectId: string
) {
  const rfisRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis"
  );
  const snap = await getDocs(rfisRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

interface ActivityPayload {
  message: string;
  userId?: string | null;
  additionalData?: Record<string, any>;
}

/**
 * addActivity - logs a message in /activities subcollection
 */
export async function addActivity(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string,
  payload: ActivityPayload
) {
  const activityColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId,
    "activities"
  );
  await addDoc(activityColl, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

/**
 * fetchActivityLog - returns array of activity docs
 */
export async function fetchActivityLog(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string
) {
  const activityColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId,
    "activities"
  );
  const snap = await getDocs(activityColl);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
