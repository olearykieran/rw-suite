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

export async function parsePdfWithPdfplumber(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch("/api/parse-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfUrl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to parse PDF: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw error;
  }
}

async function getNextRfiNumber(): Promise<number> {
  const counterRef = doc(firestore, "counters", "rfiCounter");
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

  const rfiNumber = await getNextRfiNumber();
  const rfiId =
    subject.toLowerCase().replace(/\s+/g, "-") || Math.random().toString(36).slice(2);

  const attachmentUrls: string[] = [];
  let pdfTexts: string[] = [];

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

      if (file.type === "application/pdf") {
        try {
          const pdfText = await parsePdfWithPdfplumber(downloadURL);
          if (pdfText) {
            pdfTexts.push(pdfText);
          }
        } catch (error) {
          console.error(`Failed to parse PDF ${file.name}:`, error);
        }
      }
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
    pdfTexts,
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

  await addActivity(orgId, projectId, subProjectId, rfiId, {
    message: `RFI #${rfiNumber} created: "${subject}"`,
    userId: auth.currentUser?.uid,
  });

  return rfiId;
}

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

export async function saveRfiVersion(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string,
  snapshot: Record<string, any>
) {
  const versionsRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId,
    "rfiVersions"
  );
  await addDoc(versionsRef, {
    ...snapshot,
    savedAt: serverTimestamp(),
  });
}

export async function fetchRfiVersions(
  orgId: string,
  projectId: string,
  subProjectId: string,
  rfiId: string
) {
  const versionsRef = collection(
    firestore,
    "organizations",
    orgId,
    "projects",
    projectId,
    "subprojects",
    subProjectId,
    "rfis",
    rfiId,
    "rfiVersions"
  );
  const snap = await getDocs(versionsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
