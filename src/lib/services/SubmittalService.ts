// src/lib/services/SubmittalService.ts

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
  query,
  orderBy,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * This interface includes advanced fields:
 * - workflow: array of { role, userId, status } for multi-step approvals
 * - ccList: email addresses for “FYI” distribution
 * - version: track version number if we do resubmittals
 */
export interface CreateSubmittalInput {
  orgId: string;
  projectId: string;
  subProjectId: string;
  subject: string;
  submittalType: string;
  assignedTo: string; // primary responsible
  distributionList: string[]; // required approvers or watchers
  ccList?: string[]; // optional “FYI” watchers
  dueDate?: string | null;
  status: string;
  importance: string;
  files?: FileList | null;
  createdByEmail?: string;
  workflow?: {
    role: string; // "Architect", "Engineer"
    userId: string; // "someUid"
    status: "pending" | "approved" | "rejected";
  }[];
  version?: number; // 1, 2, etc. for resubmittals
}

/**
 * getOrgSubmittalCounterDoc - doc ref under org
 */
function getOrgSubmittalCounterDoc(orgId: string) {
  return doc(firestore, "organizations", orgId, "counters", "submittalCounter");
}

/**
 * getNextSubmittalNumber - increments the submittalCounter doc for that org
 */
async function getNextSubmittalNumber(orgId: string): Promise<number> {
  const counterRef = getOrgSubmittalCounterDoc(orgId);
  let newVal = 1;

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(counterRef);
    if (!snap.exists()) {
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
 * createSubmittal - create a new doc in Firestore
 */
export async function createSubmittal(input: CreateSubmittalInput): Promise<string> {
  const {
    orgId,
    projectId,
    subProjectId,
    subject,
    submittalType,
    assignedTo,
    distributionList,
    ccList = [],
    dueDate,
    status,
    importance,
    files,
    createdByEmail,
    workflow = [],
    version = 1,
  } = input;

  // submittalNumber is org-specific
  const submittalNumber = await getNextSubmittalNumber(orgId);

  // doc ID from subject or random
  const submittalId =
    subject.toLowerCase().replace(/\s+/g, "-") || Math.random().toString(36).slice(2);

  // Upload attachments
  const attachmentUrls: string[] = [];
  if (files && files.length > 0) {
    const storage = getStorage();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileRef = ref(
        storage,
        `submittals/${orgId}/${projectId}/${subProjectId}/${submittalId}/${file.name}`
      );
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      attachmentUrls.push(downloadURL);
    }
  }

  // doc ref
  const subRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId
  );

  await setDoc(subRef, {
    submittalNumber,
    subject,
    submittalType,
    assignedTo,
    distributionList,
    ccList,
    dueDate: dueDate ? new Date(dueDate) : null,
    status,
    importance,
    attachments: attachmentUrls,
    workflow, // multi-step approvals
    version, // version # if resubmittals happen
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null,
    createdByEmail: createdByEmail || null,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
    officialResponse: null,
  });

  // optional activity
  await addSubmittalActivity(orgId, projectId, subProjectId, submittalId, {
    message: `Submittal #${submittalNumber} (v${version}) created: "${subject}"`,
    userId: auth.currentUser?.uid,
  });

  return submittalId;
}

/**
 * fetchSubmittal
 */
export async function fetchSubmittal(
  orgId: string,
  projectId: string,
  subProjectId: string,
  submittalId: string
) {
  const ref = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Submittal not found.");
  }
  return { id: snap.id, ...snap.data() };
}

/**
 * updateSubmittal
 * - can update fields like status, officialResponse, importance, or even workflow
 */
export async function updateSubmittal(
  orgId: string,
  projectId: string,
  subProjectId: string,
  submittalId: string,
  updates: Record<string, any>
) {
  const ref = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId
  );
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || null,
  });
}

/**
 * createSubmittalVersion - store a new "versions" doc if submittal is revised
 * This is how we do “version control.”
 */
export async function createSubmittalVersion(
  orgId: string,
  projectId: string,
  subProjectId: string,
  submittalId: string,
  version: number,
  updates: Record<string, any>
) {
  const versionRef = doc(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId,
    "versions",
    version.toString()
  );
  await setDoc(versionRef, {
    ...updates,
    version,
    createdAt: serverTimestamp(),
  });
}

/**
 * fetchAllSubmittals
 */
export async function fetchAllSubmittals(
  orgId: string,
  projectId: string,
  subProjectId: string
) {
  const coll = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals"
  );
  // maybe sort by submittalNumber ascending
  const snap = await getDocs(query(coll, orderBy("submittalNumber", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Activity logs
 */
interface SubmittalActivityPayload {
  message: string;
  userId?: string | null;
  additionalData?: Record<string, any>;
}

export async function addSubmittalActivity(
  orgId: string,
  projectId: string,
  subProjectId: string,
  submittalId: string,
  payload: SubmittalActivityPayload
) {
  const activityColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId,
    "activities"
  );
  await addDoc(activityColl, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function fetchSubmittalActivityLog(
  orgId: string,
  projectId: string,
  subProjectId: string,
  submittalId: string
) {
  const activityColl = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "submittals",
    submittalId,
    "activities"
  );
  const snap = await getDocs(activityColl);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
